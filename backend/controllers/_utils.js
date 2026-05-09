const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Только буквы кириллицы, без пробелов и прочих символов */
const CYRILLIC_NAME_REGEX = /^[\p{Script=Cyrillic}]+$/u;

/** Multer often delivers UTF-8 names as latin1; normalize for UI / DB originalName. */
function decodeUploadOriginalName(name) {
  if (!name || typeof name !== "string") {
    return "";
  }

  try {
    return Buffer.from(name, "latin1").toString("utf8");
  } catch {
    return name;
  }
}

/**
 * @param {string|undefined|null} value
 * @param {{ optional: boolean; label: string }} opts
 * @returns {string|null} ошибка или null
 */
function validateFioPart(value, { optional, label }) {
  if (value === undefined || value === null) {
    return optional ? null : `${label}: поле обязательно`;
  }

  const s = String(value).trim();

  if (!s) {
    return optional ? null : `${label}: поле обязательно`;
  }

  if (!CYRILLIC_NAME_REGEX.test(s)) {
    return `${label}: только кириллица, без пробелов и других символов`;
  }

  return null;
}

function displayPublicName(user) {
  if (!user || typeof user !== "object") {
    return "";
  }

  const fn = user.firstName ? String(user.firstName).trim() : "";
  const ln = user.lastName ? String(user.lastName).trim() : "";

  const joined = [fn, ln].filter(Boolean).join(" ").trim();

  return joined || fn || "";
}

function validateRegister({ email, password, firstName, lastName, patronymic }) {
  if (!email || !EMAIL_REGEX.test(String(email))) {
    return "Некорректная почта";
  }

  if (!password || String(password).length < 6) {
    return "Пароль минимум 6 символов";
  }

  const e1 = validateFioPart(firstName, { optional: false, label: "Имя" });
  if (e1) {
    return e1;
  }

  const e2 = validateFioPart(lastName, { optional: true, label: "Фамилия" });
  if (e2) {
    return e2;
  }

  const e3 = validateFioPart(patronymic, { optional: true, label: "Отчество" });
  if (e3) {
    return e3;
  }

  return null;
}

function validateLogin({ email, password }) {
  if (!email || !EMAIL_REGEX.test(String(email))) {
    return "Некорректная почта";
  }

  if (!password) {
    return "Введите пароль";
  }

  return null;
}

function sanitizeUser(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeUser);
  }

  const result = { ...value };

  if ("password" in result) {
    delete result.password;
  }

  for (const key of Object.keys(result)) {
    const v = result[key];

    if (v && typeof v === "object" && !(v instanceof Date)) {
      result[key] = sanitizeUser(v);
    }
  }

  return result;
}

module.exports = {
  EMAIL_REGEX,
  CYRILLIC_NAME_REGEX,
  decodeUploadOriginalName,
  validateRegister,
  validateLogin,
  validateFioPart,
  displayPublicName,
  sanitizeUser,
};
