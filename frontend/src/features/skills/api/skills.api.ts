import type { Skill } from "@/features/auth";
import { api } from "@/shared/api/api";

export type SkillCreateMatch = "alias" | "name" | "fuse" | "created";

export type SkillWithMatch = Skill & {
  matchedBy?: SkillCreateMatch;
};

export const skillsApi = api.injectEndpoints({
  endpoints: (builder) => ({
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

    createSkill: builder.mutation<SkillWithMatch, { name: string }>({
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
} = skillsApi;
