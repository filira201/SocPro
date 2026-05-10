import type {
  CreateProjectBody,
  ProjectCreatedPayload,
  ProjectDetail,
  ProjectsListResponse,
} from "../model/types";

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

    createProject: builder.mutation<ProjectCreatedPayload, CreateProjectBody>({
      query: (body) => ({
        url: "/projects",
        method: "POST",
        body,
      }),
      invalidatesTags: (result) => [
        { type: "Project" as const, id: "LIST" },
        ...(result ? [{ type: "Project" as const, id: result.id }] : []),
      ],
    }),

    getProjectById: builder.query<ProjectDetail, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Project" as const, id }],
    }),
  }),
});

export const {
  useGetProjectsListQuery,
  useCreateProjectMutation,
  useGetProjectByIdQuery,
} = projectsApi;
