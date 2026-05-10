/**
 * Импорт GeoNames в MongoDB (модели GeoCountry, GeoCity).
 *
 * Файлы по умолчанию: backend/files/ (или GEONAMES_ROOT)
 *   countryInfo.txt — страны (+ geonameId)
 *   cities500.txt — города с населением > 500 (имя файла можно сменить, см. ниже)
 *   ru.txt — опционально: только строки с isolanguage=ru (см. grep ниже), иначе читается
 *   alternateNamesV2.txt целиком (медленно).
 *
 * Подготовка ru.txt (macOS/Linux, из каталога с alternateNamesV2.txt):
 *   grep $'\tru\t' alternateNamesV2.txt > ru.txt
 * Положите ru.txt в files/ рядом с остальными дампами.
 *
 * Города только с населением ≥ 50 000 (официального cities50000 у GeoNames нет).
 * Из корня репозитория:
 *   awk -F'\t' 'BEGIN{OFS="\t"} /^#/ {next} NF<15 {next} $7=="P" && $8 ~ /^PPL/ && ($15+0)>=50000' \\
 *     backend/files/cities500.txt > backend/files/cities50000.txt
 * Из папки backend (тот же awk к files/cities500.txt):
 *   awk -F'\t' 'BEGIN{OFS="\t"} /^#/ {next} NF<15 {next} $7=="P" && $8 ~ /^PPL/ && ($15+0)>=50000' \\
 *     files/cities500.txt > files/cities50000.txt
 * Ту же awk-строку можно применить к cities15000.txt (меньше исходный файл).
 *
 * Узкий ru-файл под выбранный набор городов + страны (меньше строк для импорта):
 *   awk -F'\t' 'NF && !/^#/{print $1}' backend/files/cities50000.txt | sort -u > /tmp/geo_allow.txt
 *   awk -F'\t' 'NF>=17 && $17 ~ /^[0-9]+$/{print $17}' backend/files/countryInfo.txt | sort -u >> /tmp/geo_allow.txt
 *   sort -u /tmp/geo_allow.txt > backend/files/geo_geoname_ids.txt
 *   awk -F'\t' 'NR==FNR {allow[$1]; next} ($2 in allow)' \\
 *     backend/files/geo_geoname_ids.txt backend/files/ru.txt > backend/files/ru_for_import.txt
 * Дальше: GEONAMES_ALT_NAMES=ru_for_import.txt или положить файл как ru.txt.
 *
 * Переменные окружения:
 *   GEONAMES_ROOT — каталог с дампами
 *   GEONAMES_CITIES — имя или путь к файлу городов (относительно GEONAMES_ROOT, если не абсолютный)
 *   GEONAMES_ALT_NAMES — путь к alternate names (ru.txt, ru_for_import.txt, …)
 *
 * Аргументы:
 *   --clear — очистить GeoCity и GeoCountry перед импортом
 *   --cities=cities50000.txt — файл городов (приоритет над GEONAMES_CITIES)
 *
 * Запуск из папки backend:
 *   ./node_modules/.bin/prisma generate
 *   node scripts/import-geonames.js
 *   node scripts/import-geonames.js --cities=cities50000.txt
 * Повторная загрузка с нуля:
 *   node scripts/import-geonames.js --clear
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const { MongoClient } = require("mongodb");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { prisma } = require("../prisma/prismaClient");

const BATCH = 2000;
const BULK_WRITE_CHUNK = 500;

const DEFAULT_GEONAMES_DIR = path.join(__dirname, "..", "files");

function logImport(message) {
  console.log(`[${new Date().toISOString()}] [geonames] ${message}`);
}

const ROOT = process.env.GEONAMES_ROOT
  ? path.resolve(process.env.GEONAMES_ROOT)
  : DEFAULT_GEONAMES_DIR;

/** `--cities=cities50000.txt` → `cities50000.txt` */
function getArgvFlagValue(flagWithEq) {
  const raw = process.argv.find((a) => a.startsWith(flagWithEq));

  return raw ? raw.slice(flagWithEq.length) : null;
}

/** Имя БД из URI: mongodb://host:27017/dbname?… */
function getDatabaseName(uri) {
  if (!uri || typeof uri !== "string") {
    throw new Error("В .env задайте DATABASE_URL.");
  }

  const noQuery = uri.split("?")[0];
  const match = noQuery.match(/\/([^/?]+)$/);

  if (!match || match[1].includes("@")) {
    throw new Error(
      "В DATABASE_URL укажите имя базы в пути, например: mongodb://monty:pass@127.0.0.1:27017/socpro?authSource=admin",
    );
  }

  return decodeURIComponent(match[1]);
}

function isPopulatedPlace(featureClass, featureCode) {
  return (
    featureClass === "P" &&
    typeof featureCode === "string" &&
    featureCode.startsWith("PPL")
  );
}

/**
 * Выбор лучшего ru-варианта при нескольких строках (приоритет isPreferredName = 1).
 */
function mergeRuCandidate(prev, altName, prefRaw) {
  const name = (altName || "").trim();
  if (!name) {
    return prev;
  }

  const isPref = prefRaw === "1" || prefRaw === true;

  if (!prev) {
    return { name, isPref };
  }

  if (isPref && !prev.isPref) {
    return { name, isPref: true };
  }

  if (!isPref && prev.isPref) {
    return prev;
  }

  if (isPref && prev.isPref) {
    return name.length < prev.name.length ? { name, isPref: true } : prev;
  }

  if (!isPref && !prev.isPref && name.length < prev.name.length) {
    return { name, isPref: false };
  }

  return prev;
}

async function importCountries(filePath) {
  const t0 = Date.now();
  logImport(`Страны: чтение ${path.basename(filePath)} и upsert в Prisma…`);

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const rows = [];

  for (const line of lines) {
    if (!line.trim() || line.startsWith("#")) {
      continue;
    }

    const f = line.split("\t");
    if (f.length < 5) {
      continue;
    }

    const code = f[0]?.trim();
    const name = f[4]?.trim();
    const geonameIdRaw = f[16]?.trim() || null;

    if (!code || code.length !== 2 || !name) {
      continue;
    }

    rows.push({
      code: code.toUpperCase(),
      name,
      ...(geonameIdRaw && /^\d+$/.test(geonameIdRaw)
        ? { geonameId: geonameIdRaw }
        : {}),
    });
  }

  const seen = new Set();
  const unique = [];

  for (const r of rows) {
    if (seen.has(r.code)) {
      continue;
    }

    seen.add(r.code);
    unique.push(r);
  }

  let upsertN = 0;
  for (const row of unique) {
    await prisma.geoCountry.upsert({
      where: { code: row.code },
      create: {
        code: row.code,
        name: row.name,
        ...(row.geonameId ? { geonameId: row.geonameId } : {}),
      },
      update: {
        name: row.name,
        ...(row.geonameId ? { geonameId: row.geonameId } : {}),
      },
    });
    upsertN++;
    if (upsertN % 50 === 0) {
      logImport(`Страны: upsert ${upsertN}/${unique.length}…`);
    }
  }

  logImport(
    `Страны: готово — ${unique.length} записей (${Date.now() - t0} мс)`,
  );
}

async function insertCityBatch(collection, docs) {
  if (docs.length === 0) {
    return 0;
  }

  try {
    const res = await collection.insertMany(docs, { ordered: false });

    return res.insertedCount;
  } catch (err) {
    const inserted =
      err && err.result && typeof err.result.insertedCount === "number"
        ? err.result.insertedCount
        : 0;

    if (inserted > 0) {
      return inserted;
    }

    const writeErrors = err && err.writeErrors;
    if (
      Array.isArray(writeErrors) &&
      writeErrors.every((w) => w.code === 11000)
    ) {
      return 0;
    }

    throw err;
  }
}

async function streamCities(collection, filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Файл не найден: ${filePath}`);

    return;
  }

  const t0 = Date.now();
  let sizeMb = "";
  try {
    const st = fs.statSync(filePath);
    sizeMb = `${(st.size / (1024 * 1024)).toFixed(1)} МБ`;
  } catch {
    sizeMb = "?";
  }

  logImport(`${label}: начало ${path.basename(filePath)} (${sizeMb})`);

  const input = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let batch = [];
  let lineNo = 0;
  let insertedTotal = 0;

  for await (const line of rl) {
    lineNo++;

    if (!line.trim()) {
      continue;
    }

    const f = line.split("\t");
    if (f.length < 15) {
      continue;
    }

    const geonameId = f[0]?.trim();
    const name = f[1]?.trim();
    const asciiName = f[2]?.trim() || null;
    const countryCode = f[8]?.trim().toUpperCase();
    const featureClass = f[6];
    const featureCode = f[7];

    if (!geonameId || !name || !countryCode || countryCode.length !== 2) {
      continue;
    }

    if (!isPopulatedPlace(featureClass, featureCode)) {
      continue;
    }

    batch.push({
      geonameId,
      countryCode,
      name,
      asciiName,
    });

    if (batch.length >= BATCH) {
      const n = await insertCityBatch(collection, batch);
      insertedTotal += n;
      batch = [];

      if (lineNo % 10000 === 0) {
        logImport(
          `${label}: строк файла ${lineNo}, вставлено ≈${insertedTotal} (+${Date.now() - t0} мс)`,
        );
      }
    }
  }

  if (batch.length > 0) {
    const n = await insertCityBatch(collection, batch);
    insertedTotal += n;
  }

  logImport(
    `${label}: готово — строк ${lineNo}, вставлено ≈${insertedTotal} (всего ${Date.now() - t0} мс)`,
  );
}

/**
 * У Prisma уникальный индекс по geonameId уже есть под своим именем (не geonameId_1).
 * Повторный createIndex({ geonameId: 1 }) даёт IndexOptionsConflict (85).
 */
function hasUniqueGeonameIdIndex(indexes) {
  return indexes.some((ix) => {
    const k = ix.key;
    if (!k || typeof k !== "object") {
      return false;
    }

    const entries = Object.entries(k);

    return (
      entries.length === 1 &&
      entries[0][0] === "geonameId" &&
      entries[0][1] === 1 &&
      ix.unique === true
    );
  });
}

/**
 * Ускоряет bulkWrite по nameRu: без индекса Mongo делает COLLSCAN на каждый updateOne.
 * Если индекс уже создан Prisma (`db push`), не дублируем.
 */
async function ensureGeonameIdIndexes(geoCityColl, geoCountryColl) {
  logImport("Индексы MongoDB: geonameId на GeoCity и GeoCountry…");
  const t0 = Date.now();

  const cityIndexes = await geoCityColl.indexes();
  if (hasUniqueGeonameIdIndex(cityIndexes)) {
    logImport("GeoCity: уникальный индекс по geonameId уже есть — пропуск.");
  } else {
    try {
      await geoCityColl.createIndex({ geonameId: 1 }, { unique: true });
    } catch (err) {
      if (err && err.code === 85) {
        logImport(
          "GeoCity: индекс geonameId уже существует (конфликт имён) — пропуск.",
        );
      } else {
        throw err;
      }
    }
  }

  const countryIndexes = await geoCountryColl.indexes();
  if (hasUniqueGeonameIdIndex(countryIndexes)) {
    logImport("GeoCountry: уникальный индекс по geonameId уже есть — пропуск.");
  } else {
    try {
      await geoCountryColl.createIndex(
        { geonameId: 1 },
        { unique: true, sparse: true },
      );
    } catch (err) {
      logImport(
        `GeoCountry geonameId: индекс не создан (${err.message || err.code || err}); при необходимости prisma db push.`,
      );
    }
  }

  logImport(`Индексы geonameId готовы (${Date.now() - t0} мс).`);
}

/**
 * Русские имена из ru.txt / суженного файла (быстро) или alternateNamesV2.txt (полный файл).
 * Перед вызовом желательно иметь индекс geonameId на коллекциях (см. ensureGeonameIdIndexes).
 */
async function applyRussianAlternateNames(
  altFilePath,
  geoCityColl,
  geoCountryColl,
) {
  if (!fs.existsSync(altFilePath)) {
    console.warn(
      `Не найден файл русских имён (${altFilePath}). Подготовьте ru.txt (grep $'\\tru\\t' alternateNamesV2.txt > ru.txt) или положите alternateNamesV2.txt.`,
    );

    return;
  }

  const tAll = Date.now();
  const base = path.basename(altFilePath);
  const isFullAlternateFile = base === "alternateNamesV2.txt";
  /** Файл уже только ru-строки (grep или awk по allowlist) — не проверяем колонку isolanguage. */
  const skipLangFilter = base === "ru.txt" || base === "ru_for_import.txt";
  const progressEvery = isFullAlternateFile ? 2_000_000 : 100_000;

  let altSizeMb = "";
  try {
    const st = fs.statSync(altFilePath);
    altSizeMb = `${(st.size / (1024 * 1024)).toFixed(1)} МБ`;
  } catch {
    altSizeMb = "?";
  }

  logImport(
    `${base} (${altSizeMb}): ${isFullAlternateFile ? "полный alternateNamesV2 (медленно)" : "суженный файл alternate names"}`,
  );

  logImport("Запрос distinct(geonameId) по GeoCity…");
  const tDistinct = Date.now();
  const cityIds = await geoCityColl.distinct("geonameId");
  const citySet = new Set(cityIds.map(String));
  logImport(
    `GeoCity: ${citySet.size} уникальных geonameId (${Date.now() - tDistinct} мс)`,
  );

  logImport("Запрос geonameId стран (GeoCountry)…");
  const tCountries = Date.now();
  const countryRows = await geoCountryColl
    .find({ geonameId: { $exists: true, $nin: [null, ""] } })
    .project({ geonameId: 1 })
    .toArray();

  const countrySet = new Set(countryRows.map((d) => String(d.geonameId)));
  logImport(
    `GeoCountry: ${countrySet.size} записей с geonameId (${Date.now() - tCountries} мс)`,
  );

  const cityRu = new Map();
  const countryRu = new Map();

  logImport(`Чтение файла ${base} построчно…`);
  const tRead = Date.now();

  const input = fs.createReadStream(altFilePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let lineNo = 0;
  let matched = 0;

  for await (const line of rl) {
    lineNo++;

    if (!line.trim()) {
      continue;
    }

    const f = line.split("\t");
    if (f.length < 4) {
      continue;
    }

    if (!skipLangFilter && f[2] !== "ru") {
      continue;
    }

    const gid = String(f[1] ?? "").trim();
    if (!gid) {
      continue;
    }

    if (!citySet.has(gid) && !countrySet.has(gid)) {
      continue;
    }

    const altName = f[3];
    const isPref = f[4];
    let hit = false;

    if (citySet.has(gid)) {
      hit = true;
      const prev = cityRu.get(gid);
      const next = mergeRuCandidate(prev, altName, isPref);
      cityRu.set(gid, next);
    }

    if (countrySet.has(gid)) {
      hit = true;
      const prev = countryRu.get(gid);
      const next = mergeRuCandidate(prev, altName, isPref);
      countryRu.set(gid, next);
    }

    if (hit) {
      matched++;
    }

    if (lineNo % progressEvery === 0) {
      logImport(
        `${base}: строк ${lineNo}, совпадений ${matched}, ru городов ${cityRu.size}, ru стран ${countryRu.size} (+${Date.now() - tRead} мс)`,
      );
    }
  }

  logImport(
    `${base}: чтение завершено — строк ${lineNo}, совпадений ${matched}, ru городов ${cityRu.size}, ru стран ${countryRu.size} (${Date.now() - tRead} мс)`,
  );

  logImport("bulkWrite: обновление nameRu в GeoCity…");
  const tBulkCity = Date.now();

  const cityOps = [];

  for (const [gid, val] of cityRu) {
    cityOps.push({
      updateOne: {
        filter: { geonameId: gid },
        update: { $set: { nameRu: val.name } },
      },
    });

    if (cityOps.length >= BULK_WRITE_CHUNK) {
      await geoCityColl.bulkWrite(cityOps);
      cityOps.length = 0;
    }
  }

  if (cityOps.length > 0) {
    await geoCityColl.bulkWrite(cityOps);
  }

  logImport(`GeoCity bulkWrite завершён (${Date.now() - tBulkCity} мс)`);

  logImport("bulkWrite: обновление nameRu в GeoCountry…");
  const tBulkCountry = Date.now();

  const countryOps = [];

  for (const [gid, val] of countryRu) {
    countryOps.push({
      updateOne: {
        filter: { geonameId: gid },
        update: { $set: { nameRu: val.name } },
      },
    });

    if (countryOps.length >= BULK_WRITE_CHUNK) {
      await geoCountryColl.bulkWrite(countryOps);
      countryOps.length = 0;
    }
  }

  if (countryOps.length > 0) {
    await geoCountryColl.bulkWrite(countryOps);
  }

  logImport(`GeoCountry bulkWrite завершён (${Date.now() - tBulkCountry} мс)`);
  logImport(
    `Русские названия записаны (этап alternate names: ${Date.now() - tAll} мс).`,
  );
}

function resolveCitiesFilePath() {
  const arg = getArgvFlagValue("--cities=");
  const env = process.env.GEONAMES_CITIES?.trim();
  const rel = arg || env || "cities500.txt";

  return path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
}

function resolveAltNamesPath() {
  if (process.env.GEONAMES_ALT_NAMES?.trim()) {
    const rel = process.env.GEONAMES_ALT_NAMES.trim();

    return path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  }

  const ruTxtPath = path.join(ROOT, "ru.txt");

  if (fs.existsSync(ruTxtPath)) {
    return ruTxtPath;
  }

  return path.join(ROOT, "alternateNamesV2.txt");
}

async function main() {
  const clear = process.argv.includes("--clear");

  const countryPath = path.join(ROOT, "countryInfo.txt");
  const citiesPath = resolveCitiesFilePath();
  const altNamesPath = resolveAltNamesPath();
  const explicitCitiesPath = Boolean(
    getArgvFlagValue("--cities=") || process.env.GEONAMES_CITIES?.trim(),
  );

  if (explicitCitiesPath && !fs.existsSync(citiesPath)) {
    console.error(`Файл городов не найден: ${citiesPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(countryPath)) {
    console.error(
      `Не найден countryInfo.txt в ${ROOT}. Положите дампы в backend/files/ или задайте GEONAMES_ROOT.`,
    );
    process.exit(1);
  }

  if (process.env.GEONAMES_ALT_NAMES?.trim() && !fs.existsSync(altNamesPath)) {
    console.error(`GEONAMES_ALT_NAMES: файл не найден: ${altNamesPath}`);
    process.exit(1);
  }

  const uri = process.env.DATABASE_URL;
  const dbName = getDatabaseName(uri);

  let altNamesLog = path.basename(altNamesPath);
  if (process.env.GEONAMES_ALT_NAMES?.trim()) {
    altNamesLog += " (GEONAMES_ALT_NAMES)";
  } else if (path.basename(altNamesPath) === "ru.txt") {
    altNamesLog += " (ru.txt по умолчанию)";
  } else {
    altNamesLog += " (полный alternateNamesV2.txt)";
  }

  logImport(`Старт. Каталог дампов: ${ROOT}`);
  logImport(`База MongoDB: ${dbName}`);
  logImport(`Города: ${path.basename(citiesPath)} (${citiesPath})`);
  logImport(`Alternate names: ${altNamesLog}`);

  if (clear) {
    const tc = Date.now();
    logImport("Очистка GeoCity и GeoCountry (Prisma deleteMany)…");
    await prisma.geoCity.deleteMany({});
    await prisma.geoCountry.deleteMany({});
    logImport(`Очистка завершена (${Date.now() - tc} мс)`);
  }

  logImport("Импорт стран из countryInfo.txt…");
  await importCountries(countryPath);

  logImport("Подключение нативного клиента MongoDB…");
  const tConn = Date.now();
  const mongo = new MongoClient(uri);
  await mongo.connect();
  logImport(`MongoDB подключён (${Date.now() - tConn} мс)`);

  const db = mongo.db(dbName);
  const geoCityColl = db.collection("GeoCity");
  const geoCountryColl = db.collection("GeoCountry");

  try {
    logImport(`Импорт городов из ${path.basename(citiesPath)}…`);
    await streamCities(
      geoCityColl,
      citiesPath,
      path.basename(citiesPath, path.extname(citiesPath)) || "cities",
    );

    await ensureGeonameIdIndexes(geoCityColl, geoCountryColl);

    logImport("Этап русских названий (alternate names)…");
    await applyRussianAlternateNames(altNamesPath, geoCityColl, geoCountryColl);
  } finally {
    logImport("Закрытие нативного подключения MongoDB…");
    await mongo.close();
    logImport("MongoDB (нативный клиент) закрыт.");
  }

  logImport("Отключение Prisma Client…");
  await prisma.$disconnect();
  logImport("Готово.");
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
