const {
  USER_EMAIL_MAX,
  USER_FIO_PART_MAX,
  USER_PASSWORD_MAX,
  assertMaxLength,
} = require("../lib/field-limits");

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

  const tooLongMessages = {
    Имя: `Имя слишком длинное (не более ${USER_FIO_PART_MAX} символов)`,
    Фамилия: `Фамилия слишком длинная (не более ${USER_FIO_PART_MAX} символов)`,
    Отчество: `Отчество слишком длинное (не более ${USER_FIO_PART_MAX} символов)`,
  };
  const lenErr = assertMaxLength(
    s,
    USER_FIO_PART_MAX,
    tooLongMessages[label] ??
      `${label} слишком длинное (не более ${USER_FIO_PART_MAX} символов)`,
  );
  if (lenErr) {
    return lenErr.error;
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

function validateRegister({
  email,
  password,
  firstName,
  lastName,
  patronymic,
  personalDataConsent,
}) {
  const emailStr = email ? String(email) : "";
  if (!emailStr || !EMAIL_REGEX.test(emailStr)) {
    return "Некорректная почта";
  }
  const emailLenErr = assertMaxLength(
    emailStr,
    USER_EMAIL_MAX,
    `Почта слишком длинная (не более ${USER_EMAIL_MAX} символов)`,
  );
  if (emailLenErr) {
    return emailLenErr.error;
  }

  const passwordStr = password ? String(password) : "";
  if (!passwordStr || passwordStr.length < 6) {
    return "Пароль минимум 6 символов";
  }
  const passwordLenErr = assertMaxLength(
    passwordStr,
    USER_PASSWORD_MAX,
    `Пароль слишком длинный (не более ${USER_PASSWORD_MAX} символов)`,
  );
  if (passwordLenErr) {
    return passwordLenErr.error;
  }

  if (personalDataConsent !== true) {
    return "Необходимо согласие на обработку персональных данных";
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
  const emailStr = email ? String(email) : "";
  if (!emailStr || !EMAIL_REGEX.test(emailStr)) {
    return "Некорректная почта";
  }
  const emailLenErr = assertMaxLength(
    emailStr,
    USER_EMAIL_MAX,
    `Почта слишком длинная (не более ${USER_EMAIL_MAX} символов)`,
  );
  if (emailLenErr) {
    return emailLenErr.error;
  }

  const passwordStr = password ? String(password) : "";
  if (!passwordStr) {
    return "Введите пароль";
  }
  const passwordLenErr = assertMaxLength(
    passwordStr,
    USER_PASSWORD_MAX,
    `Пароль слишком длинный (не более ${USER_PASSWORD_MAX} символов)`,
  );
  if (passwordLenErr) {
    return passwordLenErr.error;
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

  if ("email" in result) {
    delete result.email;
  }

  for (const key of Object.keys(result)) {
    const v = result[key];

    if (v && typeof v === "object" && !(v instanceof Date)) {
      result[key] = sanitizeUser(v);
    }
  }

  return result;
}

function sanitizeOwnUser(user) {
  const sanitized = sanitizeUser(user);

  if (user?.email) {
    sanitized.email = user.email;
  }

  return sanitized;
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
  sanitizeOwnUser,
};
