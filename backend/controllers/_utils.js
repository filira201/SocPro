const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;

function validateRegister({ email, username, password }) {
  if (!email || !EMAIL_REGEX.test(String(email))) {
    return "Некорректная почта";
  }

  if (!username || !USERNAME_REGEX.test(String(username))) {
    return "Имя пользователя: 3-32 символа, латиница/цифры/_-";
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
  validateRegister,
  validateLogin,
  sanitizeUser,
};
