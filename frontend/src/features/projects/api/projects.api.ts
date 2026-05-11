import { defaultSerializeQueryArgs } from "@reduxjs/toolkit/query";

import type {
  ApplyToProjectBody,
  ProjectApplication,
  ProjectCreatedPayload,
  ProjectDetail,
  ProjectMembersListResponse,
  ProjectsListQuery,
  ProjectsListResponse,
  ProjectUpdateResponse,
} from "../model/types";

import { api } from "@/shared/api/api";

function normalizeProjectsListQueryForCompare(
  arg: ProjectsListQuery | undefined
) {
  return {
    limit: arg?.limit ?? 10,
    cursor: arg?.cursor ?? null,
    q: (arg?.q ?? "").trim() || null,
    member: arg?.member === true,
    acceptingApplications: arg?.acceptingApplications === true,
    sort: arg?.sort === "old" ? "old" : "new",
    skillsKey:
      [...(arg?.skillIds ?? [])].filter(Boolean).sort().join(",") || null,
  };
}

export const projectsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjectsList: builder.query<
      ProjectsListResponse,
      ProjectsListQuery | undefined
    >({
      query: (params) => {
        const request = params ?? {};
        const limit = request.limit ?? 10;
        const skillIds = request.skillIds ?? [];
        const skillsCsv = skillIds.length ? skillIds.join(",") : undefined;

        return {
          url: "/projects",
          params: {
            limit,
            ...(request.cursor ? { cursor: request.cursor } : {}),
            ...(request.q?.trim() ? { q: request.q.trim() } : {}),
            ...(request.member ? { member: "1" } : {}),
            ...(request.acceptingApplications ? { accepting: "1" } : {}),
            ...(request.sort === "old" ? { sort: "old" } : {}),
            ...(skillsCsv ? { skills: skillsCsv } : {}),
          },
        };
      },
      serializeQueryArgs: ({ queryArgs, endpointDefinition, endpointName }) => {
        const { cursor, skillIds, ...rest } = queryArgs ?? {};
        void cursor;

        const normalized = {
          ...rest,
          ...(skillIds?.length
            ? { skillIds: [...skillIds].filter(Boolean).sort() }
            : {}),
        };

        return defaultSerializeQueryArgs({
          queryArgs: normalized,
          endpointDefinition,
          endpointName,
        });
      },
      merge: (currentCache, newItems, { arg }) => {
        if (!arg || !arg.cursor) {
          currentCache.items = newItems.items;
          currentCache.nextCursor = newItems.nextCursor;

          return;
        }

        const existingIds = new Set(currentCache.items.map((item) => item.id));
        currentCache.items.push(
          ...newItems.items.filter((item) => !existingIds.has(item.id))
        );
        currentCache.nextCursor = newItems.nextCursor;
      },
      forceRefetch({ currentArg, previousArg }) {
        if (previousArg === undefined) {
          return true;
        }

        const cur = normalizeProjectsListQueryForCompare(currentArg);
        const prev = normalizeProjectsListQueryForCompare(previousArg);

        return (
          cur.cursor !== prev.cursor ||
          cur.q !== prev.q ||
          cur.member !== prev.member ||
          cur.acceptingApplications !== prev.acceptingApplications ||
          cur.sort !== prev.sort ||
          cur.skillsKey !== prev.skillsKey ||
          cur.limit !== prev.limit
        );
      },
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

    createProject: builder.mutation<ProjectCreatedPayload, FormData>({
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

    getProjectMembers: builder.query<
      ProjectMembersListResponse,
      {
        projectId: string;
        skip: number;
        take: number;
        q: string;
        /** Не уходит на сервер; меняется после мутаций, чтобы сбросить merge-кэш. */
        listEpoch?: number;
      }
    >({
      query: ({ projectId, skip, take, q }) => ({
        url: `/projects/${projectId}/members`,
        params: { skip, take, q },
      }),
      serializeQueryArgs: ({ queryArgs }) => {
        const epoch = queryArgs.listEpoch ?? 0;

        return `getProjectMembers(${queryArgs.projectId},${queryArgs.q},${epoch})`;
      },
      merge: (currentCache, incoming, { arg }) => {
        if (arg.skip === 0) {
          return incoming;
        }

        if (!currentCache) {
          return incoming;
        }

        return {
          ...incoming,
          items: [...currentCache.items, ...incoming.items],
          total: incoming.total,
          take: incoming.take,
          skip: arg.skip,
        };
      },
      forceRefetch({ currentArg, previousArg }) {
        if (!previousArg || !currentArg) {
          return true;
        }

        return (
          currentArg.projectId !== previousArg.projectId ||
          currentArg.q !== previousArg.q ||
          (currentArg.listEpoch ?? 0) !== (previousArg.listEpoch ?? 0)
        );
      },
      providesTags: (_r, _e, { projectId }) => [
        { type: "ProjectMembers" as const, id: projectId },
      ],
    }),

    updateProject: builder.mutation<
      ProjectUpdateResponse,
      { id: string; body: FormData }
    >({
      query: ({ id, body }) => ({
        url: `/projects/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Project" as const, id },
        { type: "Project" as const, id: "LIST" },
      ],
    }),

    deleteProject: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/projects/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Project" as const, id: "LIST" },
        { type: "Project" as const, id },
      ],
    }),

    decideApplication: builder.mutation<
      ProjectApplication,
      {
        applicationId: string;
        projectId: string;
        status: "ACCEPTED" | "REJECTED";
      }
    >({
      query: ({ applicationId, status }) => ({
        url: `/applications/${applicationId}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "Project" as const, id: projectId },
        { type: "ProjectMembers" as const, id: projectId },
      ],
    }),

    applyToProject: builder.mutation<
      ProjectApplication,
      { projectId: string; body: ApplyToProjectBody }
    >({
      query: ({ projectId, body }) => ({
        url: `/projects/${projectId}/apply`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "Project" as const, id: projectId },
        { type: "ProjectMembers" as const, id: projectId },
      ],
    }),

    removeProjectMember: builder.mutation<
      { message: string },
      { projectId: string; userId: string }
    >({
      query: ({ projectId, userId }) => ({
        url: `/projects/${projectId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "Project" as const, id: projectId },
        { type: "Project" as const, id: "LIST" },
        { type: "ProjectMembers" as const, id: projectId },
      ],
    }),

    updateProjectMemberRole: builder.mutation<
      unknown,
      { projectId: string; userId: string; role: "MEMBER" | "ADMIN" }
    >({
      query: ({ projectId, userId, role }) => ({
        url: `/projects/${projectId}/members/${userId}`,
        method: "PATCH",
        body: { role },
      }),
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "Project" as const, id: projectId },
        { type: "Project" as const, id: "LIST" },
        { type: "ProjectMembers" as const, id: projectId },
      ],
    }),

    cancelApplication: builder.mutation<
      { message: string },
      { applicationId: string; projectId: string }
    >({
      query: ({ applicationId }) => ({
        url: `/applications/${applicationId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { projectId }) => [
        { type: "Project" as const, id: projectId },
      ],
    }),
  }),
});

export const {
  useGetProjectsListQuery,
  useCreateProjectMutation,
  useGetProjectByIdQuery,
  useGetProjectMembersQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useDecideApplicationMutation,
  useApplyToProjectMutation,
  useRemoveProjectMemberMutation,
  useUpdateProjectMemberRoleMutation,
  useCancelApplicationMutation,
} = projectsApi;
