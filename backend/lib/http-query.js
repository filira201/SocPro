const { filterValidIds } = require("./id");

/**
 * @param {unknown} value
 * @param {{ defaultLimit: number; maxLimit: number }} opts
 */
function normalizeListLimit(value, { defaultLimit, maxLimit }) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultLimit;
  }

  return Math.min(parsed, maxLimit);
}

/** Query-флаг вида `1` / `true` / `yes`. */
function parseTruthyQueryFlag(value) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();

  return v === "1" || v === "true" || v === "yes";
}

function parseSortOldestFirst(value) {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase() === "old"
  );
}

function parseRequiredSkillIdsFromBody(raw) {
  return filterValidIds(raw);
}

function parseRemoveAttachmentIds(value) {
  return filterValidIds(value);
}

/**
 * @returns {boolean | undefined | null}
 *   undefined — поле не передано; null — невалидное значение; boolean — ок.
 */
function parseAcceptingApplicationsBody(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function optionalTrimmedString(body, key) {
  if (body[key] === undefined) {
    return undefined;
  }

  const s = String(body[key]).trim();

  return s === "" ? null : s;
}

function normalizeOptionalName(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const s = String(value).trim();

  return s === "" ? null : s;
}

module.exports = {
  normalizeListLimit,
  parseTruthyQueryFlag,
  parseSortOldestFirst,
  parseRequiredSkillIdsFromBody,
  parseRemoveAttachmentIds,
  parseAcceptingApplicationsBody,
  optionalTrimmedString,
  normalizeOptionalName,
};
