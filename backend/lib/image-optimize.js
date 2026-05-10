/**
 * Оптимизация загруженных изображений (multer diskStorage): ресайз, сжатие, защита по пикселям.
 * Документы и GIF не трогаем; SVG отклоняем.
 */

const fs = require("fs/promises");
const sharp = require("sharp");

const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1920;
/**
 * Защита от декомпрессионных «бомб» по числу пикселей на входе.
 * Пикселей должно хватать для обычных фото с камеры/телефона (десятки МП);
 * выход всё равно ограничен resize — см. MAX_IMAGE_*.
 */
const LIMIT_INPUT_PIXELS = 10_000 * 10_000;

const JPEG_QUALITY = 82;
const PNG_COMPRESSION_LEVEL = 9;
const WEBP_QUALITY = 80;

function isSvg(mimetype, originalname) {
  return (
    mimetype === "image/svg+xml" || /\.svg$/i.test(String(originalname || ""))
  );
}

function isGif(mimetype) {
  return mimetype === "image/gif";
}

/**
 * Удаляет файлы multer с диска (игнорирует ошибки).
 * @param {Array<{ path?: string }>} files
 */
async function unlinkMulterFiles(files) {
  await Promise.all(
    (files || []).map((f) =>
      f?.path ? fs.unlink(f.path).catch(() => {}) : Promise.resolve(),
    ),
  );
}

/**
 * Оптимизирует один файл на месте: запись во временный файл, затем rename.
 * Обновляет file.size; mime для JPEG может стать image/jpeg.
 *
 * @param {import("multer").File} file
 * @throws {Error} с message на русском для клиента
 */
async function optimizeImageFile(file) {
  if (!file.mimetype?.startsWith("image/")) {
    return;
  }

  if (isSvg(file.mimetype, file.originalname)) {
    await fs.unlink(file.path).catch(() => {});
    const err = new Error(
      "Формат SVG для изображений не поддерживается. Загрузите PNG или JPEG.",
    );
    err.code = "IMAGE_OPTIMIZE_REJECT";
    throw err;
  }

  if (isGif(file.mimetype)) {
    return;
  }

  const mime = file.mimetype.toLowerCase();
  const inputPath = file.path;
  const tempPath = `${inputPath}.opt.tmp`;

  let pipeline = sharp(inputPath, {
    limitInputPixels: LIMIT_INPUT_PIXELS,
  })
    .rotate()
    .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
      fit: "inside",
      withoutEnlargement: true,
    });

  if (mime === "image/png") {
    pipeline = pipeline.png({ compressionLevel: PNG_COMPRESSION_LEVEL });
  } else if (mime === "image/webp") {
    pipeline = pipeline.webp({ quality: WEBP_QUALITY });
  } else if (mime === "image/jpeg" || mime === "image/jpg") {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    file.mimetype = "image/jpeg";
  } else {
    // Прочие растровые типы не перекодируем (во избежание смены расширения без переименования).
    return;
  }

  try {
    await pipeline.toFile(tempPath);
    await fs.rename(tempPath, inputPath);
    const st = await fs.stat(inputPath);
    file.size = st.size;
  } catch (e) {
    await fs.unlink(tempPath).catch(() => {});
    const err = new Error(
      "Не удалось обработать изображение. Проверьте файл и попробуйте снова.",
    );
    err.code = "IMAGE_OPTIMIZE_FAILED";
    err.cause = e;
    throw err;
  }
}

/**
 * Последовательная оптимизация всех файлов из multer.
 * При ошибке вызывающий код должен выполнить unlinkMulterFiles(files).
 *
 * @param {import("multer").File[]} files
 */
async function optimizeUploadedImages(files) {
  const list = files || [];

  for (let i = 0; i < list.length; i += 1) {
    await optimizeImageFile(list[i]);
  }
}

module.exports = {
  optimizeImageFile,
  optimizeUploadedImages,
  unlinkMulterFiles,
  LIMIT_INPUT_PIXELS,
};
