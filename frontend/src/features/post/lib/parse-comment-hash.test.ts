import { describe, expect, test } from "vitest";

import { parseCommentHash } from "./parse-comment-hash";

describe("parseCommentHash", () => {
  test("извлекает id из #comment-{objectId}", () => {
    expect(parseCommentHash("#comment-6a0c96bf4dbfb0b7a7569ff0")).toBe(
      "6a0c96bf4dbfb0b7a7569ff0"
    );
  });

  test("возвращает null для пустого или неверного hash", () => {
    expect(parseCommentHash("")).toBeNull();
    expect(parseCommentHash("#post-123")).toBeNull();
    expect(parseCommentHash("#comment-short")).toBeNull();
  });
});
