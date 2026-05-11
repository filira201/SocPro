import type { ProjectDetail } from "../model/types";

export type ProjectPermissions = {
  isOwner: boolean;
  isMember: boolean;
  requesterRole: string | null;
  canManageProject: boolean;
  canManageMembers: boolean;
};

export function getProjectPermissions(
  project: ProjectDetail,
  currentUserId: string | null | undefined
): ProjectPermissions {
  const isOwner = project.isOwner;
  const isMember = project.isMember;

  const row = currentUserId
    ? project.members?.find((m) => m.userId === currentUserId)
    : undefined;
  const requesterRole = row?.role ?? null;

  const canManageProject = isOwner || requesterRole === "ADMIN";
  const canManageMembers = isOwner;

  return {
    isOwner,
    isMember,
    requesterRole,
    canManageProject,
    canManageMembers,
  };
}
