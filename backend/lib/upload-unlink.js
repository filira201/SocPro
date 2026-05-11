const path = require("path");
const fs = require("fs");

/** Удаляет файл из `uploads/` по публичному URL вида `/uploads/...`. */
function unlinkUploadByPublicUrl(urlPath) {
  if (
    !urlPath ||
    typeof urlPath !== "string" ||
    !urlPath.startsWith("/uploads/")
  ) {
    return;
  }

  const base = path.basename(urlPath);

  if (!base || base === "." || base === "..") {
    return;
  }

  const full = path.join(__dirname, "../uploads", base);
  fs.unlink(full, () => {});
}

module.exports = { unlinkUploadByPublicUrl };
