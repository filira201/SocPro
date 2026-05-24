/**
 * Регулярка валидации id ресурса в URL/параметрах.
 *
 * Backend на Prisma выдаёт cuid v1 (`c` + 24 alphanumeric, всего 25 символов,
 * lowercase). Также пропускаем legacy MongoDB ObjectId (24 hex, регистр любой)
 * на случай старых ссылок и фикстур в тестах.
 */
export const ID_REGEX = /^[a-z0-9]{24,32}$/i;

export function isValidId(value: unknown): value is string {
  return typeof value === "string" && ID_REGEX.test(value);
}
