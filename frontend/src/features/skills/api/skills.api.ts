import type { Skill } from "@/features/auth";
import { api } from "@/shared/api/api";

export type SkillCreateMatch = "alias" | "name" | "fuse" | "created";

export type SkillWithMatch = Skill & {
  matchedBy?: SkillCreateMatch;
};

export type SkillIdName = Pick<Skill, "id" | "name">;

export const skillsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    resolveSkillsByIds: builder.query<SkillIdName[], string[]>({
      query: (ids) => {
        const unique = [...new Set(ids)].filter(Boolean);

        return {
          url: "/skills/resolve",
          params: { ids: unique.sort().join(",") },
        };
      },
      serializeQueryArgs: ({ queryArgs }) => {
        const unique = [...new Set(queryArgs ?? [])].filter(Boolean).sort();

        return unique.join(",") || "empty";
      },
    }),

    listSkills: builder.query<
      Skill[],
      { q?: string; take?: number; skip?: number }
    >({
      query: ({ q = "", take = 50, skip = 0 }) => ({
        url: "/skills",
        params: {
          q,
          take: Math.min(take, 200),
          skip: Math.max(skip, 0),
        },
      }),
      providesTags: [{ type: "Skill", id: "LIST" }],
    }),

    createSkill: builder.mutation<
      SkillWithMatch,
      { name: string; skipFuse?: boolean }
    >({
      query: (body) => ({
        url: "/skills",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Skill", id: "LIST" }],
    }),
  }),
});

export const {
  useListSkillsQuery,
  useLazyListSkillsQuery,
  useCreateSkillMutation,
  useResolveSkillsByIdsQuery,
} = skillsApi;
