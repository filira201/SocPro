import type { ProjectsListResponse } from "../model/types";

import { api } from "@/shared/api/api";

export type ProjectsListQuery = {
  take?: number;
  skip?: number;
};

/** По умолчанию для GET /projects (пагинацию можно добавить вторым эндпоинтом или сменой типа arg). */
const DEFAULT_PROJECTS_LIST_TAKE = 100;

export const projectsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjectsList: builder.query<ProjectsListResponse, void>({
      query: () => ({
        url: "/projects",
        params: {
          take: DEFAULT_PROJECTS_LIST_TAKE,
          skip: 0,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              { type: "Project" as const, id: "LIST" },
              ...result.items.map((p) => ({
                type: "Project" as const,
                id: p.id,
              })),
            ]
          : [{ type: "Project" as const, id: "LIST" }],
    }),
  }),
});

export const { useGetProjectsListQuery } = projectsApi;
