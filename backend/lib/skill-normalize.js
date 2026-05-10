/**
 * Нормализация строки навыка для словаря алиасов и Fuse.
 * Точное совпадение по ключу отделяет Java от JavaScript (разные записи в словаре).
 */
function cleanSkillKey(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

/** Порог Fuse: выше — больше «похожих» кандидатов (0 = только идеальные совпадения). */
const FUSE_THRESHOLD = 0.38;

/** Максимальный score первого результата Fuse (0 = идеал, 1 = плохо). */
const FUSE_MAX_SCORE = 0.52;

/** Если второй кандидат почти так же хорош — не доверяем fuzzy. */
const FUSE_MIN_SCORE_GAP = 0.06;

/** Не гоняем Fuse на очень коротком вводе (кроме уже найденного alias). */
const FUSE_MIN_QUERY_LEN = 3;

module.exports = {
  cleanSkillKey,
  FUSE_THRESHOLD,
  FUSE_MAX_SCORE,
  FUSE_MIN_SCORE_GAP,
  FUSE_MIN_QUERY_LEN,
};
