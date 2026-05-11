import { z } from "zod";

import { parseSkillIdsFromSearchParams } from "@/features/projects/model/projects-feed-params";

const usersDirectoryUrlSchema = z.object({
  q: z.string().transform((s) => s.trim().slice(0, 200)),
});

export type UsersDirectoryUrlState = z.infer<typeof usersDirectoryUrlSchema> & {
  skillIds: string[];
};

export function parseUsersDirectorySearchParams(
  searchParams: URLSearchParams
): UsersDirectoryUrlState {
  const rawQ = searchParams.get("q") ?? "";
  const skillIds = parseSkillIdsFromSearchParams(searchParams);

  const parsed = usersDirectoryUrlSchema.safeParse({ q: rawQ });

  if (!parsed.success) {
    return { q: "", skillIds };
  }

  return { ...parsed.data, skillIds };
}

export function usersDirectoryToListQuery(feed: UsersDirectoryUrlState): {
  q?: string;
  skillIds?: string[];
} {
  return {
    ...(feed.q ? { q: feed.q } : {}),
    ...(feed.skillIds.length ? { skillIds: feed.skillIds } : {}),
  };
}
