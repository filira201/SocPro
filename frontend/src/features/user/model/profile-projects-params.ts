import { z } from "zod";

/** Префикс параметров URL для блока «Проекты» на странице профиля (не пересекается с лентой проектов). */
export const PROFILE_PROJECTS_Q_PARAM = "upq";
export const PROFILE_PROJECTS_AUTHOR_PARAM = "upauthor";

const profileProjectsFeedUrlSchema = z.object({
  q: z.string().transform((s) => s.trim().slice(0, 200)),
  authorOnly: z.boolean(),
});

export type ProfileProjectsFeedUrlState = z.infer<
  typeof profileProjectsFeedUrlSchema
>;

export function parseProfileProjectsSearchParams(
  searchParams: URLSearchParams
): ProfileProjectsFeedUrlState {
  const rawQ = searchParams.get(PROFILE_PROJECTS_Q_PARAM) ?? "";
  const rawAuthor = searchParams.get(PROFILE_PROJECTS_AUTHOR_PARAM);

  const parsed = profileProjectsFeedUrlSchema.safeParse({
    q: rawQ,
    authorOnly: rawAuthor === "1",
  });

  if (!parsed.success) {
    return { q: "", authorOnly: false };
  }

  return parsed.data;
}

export function profileProjectsFeedToListFilters(
  feed: ProfileProjectsFeedUrlState
): { q?: string; authorOnly?: boolean } {
  return {
    ...(feed.q ? { q: feed.q } : {}),
    ...(feed.authorOnly ? { authorOnly: true } : {}),
  };
}
