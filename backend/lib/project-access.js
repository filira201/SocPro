/**
 * Права на проект: владелец (ownerId) и роль ADMIN у участника.
 */

function isProjectOwner(project, userId) {
  return project?.ownerId === userId;
}

function isProjectAdminRole(membership) {
  return membership?.role === "ADMIN";
}

/** Редактирование проекта, заявки, список заявок — владелец или ADMIN. */
function canManageProjectAsAdminOrOwner(project, userId, membership) {
  if (isProjectOwner(project, userId)) {
    return true;
  }
  return isProjectAdminRole(membership);
}

/** Удаление проекта, исключение участников, смена ролей — только владелец. */
function canManageMembersAsOwnerOnly(project, userId) {
  return isProjectOwner(project, userId);
}

/** Терминальные статусы: заявки не принимаются независимо от поля acceptingApplications. */
function isTerminalProjectStatus(status) {
  return status === "CLOSED" || status === "DONE";
}

/** Старые документы без поля считаем открытыми для заявок. */
function projectAcceptsApplications(project) {
  if (isTerminalProjectStatus(project?.status)) {
    return false;
  }
  if (
    project.acceptingApplications === undefined ||
    project.acceptingApplications === null
  ) {
    return true;
  }
  return Boolean(project.acceptingApplications);
}

function normalizeProjectForApi(project) {
  if (!project || typeof project !== "object") {
    return project;
  }
  return {
    ...project,
    acceptingApplications: projectAcceptsApplications(project),
    statusUpdatedAt: project.statusUpdatedAt ?? project.createdAt ?? null,
  };
}

module.exports = {
  isProjectOwner,
  isProjectAdminRole,
  canManageProjectAsAdminOrOwner,
  canManageMembersAsOwnerOnly,
  isTerminalProjectStatus,
  projectAcceptsApplications,
  normalizeProjectForApi,
};
