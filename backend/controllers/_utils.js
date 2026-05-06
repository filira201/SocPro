const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[\p{L}\p{N}_-]{3,32}$/u;

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

function validateRegister({ email, username, password }) {
  if (!email || !EMAIL_REGEX.test(String(email))) {
    return "Некорректная почта";
  }

  if (!username || !USERNAME_REGEX.test(String(username))) {
    return "Имя пользователя: 3-32 символа, буквы/цифры/_-";
  }

  if (!password || String(password).length < 6) {
    return "Пароль минимум 6 символов";
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
  USERNAME_REGEX,
  decodeUploadOriginalName,
  validateRegister,
  validateLogin,
  sanitizeUser,
};
