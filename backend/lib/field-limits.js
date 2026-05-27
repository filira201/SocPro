/**
 * Единый источник лимитов длины текстовых полей (синхронно с frontend zod/maxLength).
 * В PostgreSQL те же числа заданы через @db.VarChar(n) в schema.prisma.
 */

const POST_CONTENT_MAX = 5000;
const COMMENT_CONTENT_MAX = 2000;

const USER_BIO_MAX = 2000;
/** university, course, faculty — синхронно с frontend profile-edit-schema */
const USER_EDUCATION_FIELD_MAX = 500;
const USER_CONTACT_VALUE_MAX = 500;
/** register/login — синхронно с frontend auth-field-limits */
const USER_EMAIL_MAX = 260;
const USER_FIO_PART_MAX = 100;
/** plaintext на register/login; в БД — VARCHAR(255) под bcrypt-хэш */
const USER_PASSWORD_MAX = 128;

const PROJECT_TITLE_MAX = 500;
const PROJECT_DESCRIPTION_MAX = 5000;
const PROJECT_GOALS_MAX = 5000;
const PROJECT_APPLICATION_MESSAGE_MAX = 1000;

/**
 * @param {string} value — уже trim, если нужен trim — вызывающий код
 * @param {number} max
 * @param {string} errorMessage
 * @returns {{ error: string } | null}
 */
function assertMaxLength(value, max, errorMessage) {
  if (value.length > max) {
    return { error: errorMessage };
  }
  return null;
}

/**
 * @param {string | null | undefined} value — после trim; null/undefined пропускаются
 * @param {number} max
 * @param {string} errorMessage
 * @returns {{ error: string } | null}
 */
function assertOptionalMaxLength(value, max, errorMessage) {
  if (value == null) {
    return null;
  }
  return assertMaxLength(value, max, errorMessage);
}

module.exports = {
  POST_CONTENT_MAX,
  COMMENT_CONTENT_MAX,
  USER_BIO_MAX,
  USER_EDUCATION_FIELD_MAX,
  USER_CONTACT_VALUE_MAX,
  USER_EMAIL_MAX,
  USER_FIO_PART_MAX,
  USER_PASSWORD_MAX,
  PROJECT_TITLE_MAX,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_GOALS_MAX,
  PROJECT_APPLICATION_MESSAGE_MAX,
  assertMaxLength,
  assertOptionalMaxLength,
};
