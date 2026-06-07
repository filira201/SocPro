/**
 * Регулярка валидации идентификатора ресурса в HTTP-ручках.
 *
 * Prisma по умолчанию выдаёт cuid v1: `c` + 24 alphanumeric (всего 25 символов, нижний регистр).
 * Для обратной совместимости со старыми идентификаторами в URL/тестах принимаем
 * также прежний MongoDB ObjectId формат (24 hex). Регистр игнорируется.
 *
 * Используется для отбраковки заведомо «битых» id на входе (400 вместо 500).
 */
const ID_REGEX = /^[a-z0-9]{24,32}$/i;

const VALID_ID = "507f1f77bcf86cd799439011";

function isValidId(id) {
  return ID_REGEX.test(String(id));
}

/** CSV id из query (skills, requiredSkillIds и т.п.). */
function parseCsvIds(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ID_REGEX.test(s));
}

/** Массив или одиночное значение → только валидные id. */
function filterValidIds(value) {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(String).filter((id) => ID_REGEX.test(id));
  }

  const s = String(value).trim();

  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);

      if (Array.isArray(parsed)) {
        return parsed.map(String).filter((id) => ID_REGEX.test(id));
      }
    } catch {
      return [];
    }

    return [];
  }

  return parseCsvIds(s);
}

module.exports = {
  ID_REGEX,
  VALID_ID,
  isValidId,
  parseCsvIds,
  filterValidIds,
};
