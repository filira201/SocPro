/** Лимиты полей проекта и заявки — синхронно с frontend/src/features/projects/model/project-field-limits.ts */

const {
  PROJECT_TITLE_MAX,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_GOALS_MAX,
  PROJECT_APPLICATION_MESSAGE_MAX,
  assertMaxLength,
} = require("./field-limits");

function normalizeProjectText(value) {
  return String(value ?? "").trim();
}

/**
 * @returns {{ error: string } | { error: null, title: string, description: string, goals: string }}
 */
function validateProjectTextsForCreate(body) {
  const title = normalizeProjectText(body?.title);
  const description = normalizeProjectText(body?.description);
  const goals = normalizeProjectText(body?.goals);

  const titleErr = assertMaxLength(
    title,
    PROJECT_TITLE_MAX,
    `Название слишком длинное (не более ${PROJECT_TITLE_MAX} символов)`,
  );
  if (titleErr) {
    return titleErr;
  }
  const descErr = assertMaxLength(
    description,
    PROJECT_DESCRIPTION_MAX,
    `Описание слишком длинное (не более ${PROJECT_DESCRIPTION_MAX} символов)`,
  );
  if (descErr) {
    return descErr;
  }
  const goalsErr = assertMaxLength(
    goals,
    PROJECT_GOALS_MAX,
    `Цели слишком длинные (не более ${PROJECT_GOALS_MAX} символов)`,
  );
  if (goalsErr) {
    return goalsErr;
  }

  if (!title || !description || !goals) {
    return { error: "Название, описание и цели обязательны" };
  }

  return { error: null, title, description, goals };
}

/**
 * @param {unknown} raw
 * @param {number} max
 * @param {string} tooLongMessage — полное сообщение об ошибке при превышении max
 * @param {string} [emptyMessage] — если передано и поле после trim пустое, вернуть эту ошибку
 * @returns {{ error: string, value: null } | { error: null, value: string | undefined }}
 */
function validateProjectTextForUpdate(raw, max, tooLongMessage, emptyMessage) {
  if (raw === undefined) {
    return { error: null, value: undefined };
  }
  const s = String(raw).trim();
  if (emptyMessage && s.length === 0) {
    return { error: emptyMessage, value: null };
  }
  const lenErr = assertMaxLength(s, max, tooLongMessage);
  if (lenErr) {
    return { error: lenErr.error, value: null };
  }
  return { error: null, value: s };
}

/**
 * @returns {{ error: string } | { error: null, value: string | undefined }}
 */
function normalizeApplicationMessage(raw) {
  if (raw === undefined || raw === null) {
    return { error: null, value: undefined };
  }
  const s = String(raw).trim();
  const lenErr = assertMaxLength(
    s,
    PROJECT_APPLICATION_MESSAGE_MAX,
    `Сообщение слишком длинное (не более ${PROJECT_APPLICATION_MESSAGE_MAX} символов)`,
  );
  if (lenErr) {
    return lenErr;
  }
  return { error: null, value: s || undefined };
}

module.exports = {
  PROJECT_TITLE_MAX,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_GOALS_MAX,
  PROJECT_APPLICATION_MESSAGE_MAX,
  normalizeProjectText,
  validateProjectTextsForCreate,
  validateProjectTextForUpdate,
  normalizeApplicationMessage,
};
