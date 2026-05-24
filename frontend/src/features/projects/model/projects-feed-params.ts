import { z } from "zod";

import { PROJECTS_LIST_SORT_VALUES, type ProjectsListQuery } from "./types";

import { ID_REGEX } from "@/shared/lib/id";

export const MAX_PROJECT_FEED_SKILL_IDS = 20;

const projectsFeedUrlSchema = z.object({
  q: z.string().transform((s) => s.trim().slice(0, 200)),
  member: z.boolean(),
  acceptingApplications: z.boolean(),
  sort: z.enum(PROJECTS_LIST_SORT_VALUES),
});

export type ProjectsFeedUrlState = z.infer<typeof projectsFeedUrlSchema> & {
  skillIds: string[];
};

export function parseSkillIdsFromSearchParams(
  searchParams: URLSearchParams
): string[] {
  const raw = searchParams.get("skills");

  if (!raw) {
    return [];
  }

  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ID_REGEX.test(s));

  return ids.slice(0, MAX_PROJECT_FEED_SKILL_IDS);
}

export function parseProjectsFeedSearchParams(
  searchParams: URLSearchParams
): ProjectsFeedUrlState {
  const rawQ = searchParams.get("q") ?? "";
  const rawMember = searchParams.get("member");
  const rawAccepting = searchParams.get("accepting");
  const rawSort = searchParams.get("sort");

  const skillIds = parseSkillIdsFromSearchParams(searchParams);

  const parsed = projectsFeedUrlSchema.safeParse({
    q: rawQ,
    member: rawMember === "1",
    acceptingApplications: rawAccepting === "1",
    sort: rawSort === "old" ? "old" : "new",
  });

  if (!parsed.success) {
    return {
      q: "",
      member: false,
      acceptingApplications: false,
      sort: "new",
      skillIds,
    };
  }

  return { ...parsed.data, skillIds };
}

export function projectsFeedToListQuery(
  feed: ProjectsFeedUrlState
): Pick<
  ProjectsListQuery,
  "q" | "member" | "acceptingApplications" | "sort" | "skillIds"
> {
  return {
    ...(feed.q ? { q: feed.q } : {}),
    ...(feed.member ? { member: true } : {}),
    ...(feed.acceptingApplications ? { acceptingApplications: true } : {}),
    ...(feed.sort === "old" ? { sort: "old" } : {}),
    ...(feed.skillIds.length ? { skillIds: feed.skillIds } : {}),
  };
}
