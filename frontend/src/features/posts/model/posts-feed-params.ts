import { z } from "zod";

import { POSTS_SORT_VALUES, type PostsQuery } from "./types";

const postsFeedUrlSchema = z.object({
  q: z.string().transform((s) => s.trim().slice(0, 200)),
  mine: z.boolean(),
  sort: z.enum(POSTS_SORT_VALUES),
});

export type PostsFeedUrlState = z.infer<typeof postsFeedUrlSchema>;

export function parsePostsFeedSearchParams(
  searchParams: URLSearchParams
): PostsFeedUrlState {
  const rawQ = searchParams.get("q") ?? "";
  const rawMine = searchParams.get("mine");
  const rawSort = searchParams.get("sort");

  const parsed = postsFeedUrlSchema.safeParse({
    q: rawQ,
    mine: rawMine === "1",
    sort: rawSort === "old" ? "old" : "new",
  });

  if (!parsed.success) {
    return { q: "", mine: false, sort: "new" };
  }

  return parsed.data;
}

export function postsFeedToApiQuery(
  feed: PostsFeedUrlState
): Pick<PostsQuery, "q" | "mine" | "sort"> {
  return {
    ...(feed.q ? { q: feed.q } : {}),
    ...(feed.mine ? { mine: true } : {}),
    ...(feed.sort === "old" ? { sort: "old" } : {}),
  };
}
