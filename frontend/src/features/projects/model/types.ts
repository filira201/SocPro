import type { Skill, User } from "@/features/auth";
import type { Attachment } from "@/features/posts/model/types";

/** Вложение проекта (структура как у поста). */
export type ProjectAttachment = Attachment;

/** Ответ списка проектов (GET /projects, курсорная пагинация). */
export type ProjectsListResponse = {
  items: ProjectListItem[];
  nextCursor: string | null;
};

export const PROJECTS_LIST_SORT_VALUES = ["new", "old"] as const;
export type ProjectsListSort = (typeof PROJECTS_LIST_SORT_VALUES)[number];

/** Аргументы GET /projects для RTK Query. */
export type ProjectsListQuery = {
  cursor?: string | null;
  limit?: number;
  /** Поиск по названию проекта. */
  q?: string;
  sort?: ProjectsListSort;
  /** Только проекты, где текущий пользователь в составе. */
  member?: boolean;
  /** Только проекты, которые сейчас принимают заявки на участие. */
  acceptingApplications?: boolean;
  /** Только проекты, где владелец — выбранный пользователь (блок «Проекты» в профиле). */
  authorOnly?: boolean;
  /** Все перечисленные навыки должны быть среди требуемых к проекту. */
  skillIds?: string[];
};

export type ProjectListItem = {
  id: string;
  title: string;
  description: string;
  goals: string;
  status: string;
  acceptingApplications: boolean;
  statusUpdatedAt?: string | null;
  createdAt: string;
  owner: User;
  requiredSkills: Skill[];
  _count: {
    members: number;
    applications: number;
    /** С бэка с новой версии API; для старых ответов может отсутствовать. */
    attachments?: number;
  };
};

/** Заявка приглашённого на проект (фрагмент для GET /projects/managed?inviteeId=). */
export type InviteeApplicationSummary = {
  id: string;
  status: string;
} | null;

/** Элемент списка «мои проекты как автор/админ» с контекстом приглашения. */
export type ManagedProjectListItem = ProjectListItem & {
  inviteeApplication: InviteeApplicationSummary;
  inviteeIsMember: boolean;
};

export type ManagedProjectsListResponse = {
  items: ManagedProjectListItem[];
  nextCursor: string | null;
};

/** Аргументы GET /projects/managed. */
export type ManagedProjectsListQuery = {
  inviteeId: string;
  cursor?: string | null;
  limit?: number;
  q?: string;
};

export type InviteToProjectBody = {
  inviteeId: string;
  message?: string;
};

/** Участник проекта (GET /projects/:id, POST /projects). */
export type ProjectMemberRow = {
  id: string;
  userId: string;
  role: string;
  joinedAt?: string;
  user: User;
};

/** Ответ списка участников (GET /projects/:id/members). */
export type ProjectMembersListResponse = {
  items: ProjectMemberRow[];
  total: number;
  take: number;
  skip: number;
};

export type ProjectDetail = {
  id: string;
  title: string;
  description: string;
  goals: string;
  status: string;
  acceptingApplications: boolean;
  statusUpdatedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  owner: User;
  requiredSkills: Skill[];
  /** Может приходить как ObjectId-массив с бэка; для UI достаточно requiredSkills */
  requiredSkillIds?: string[];
  members: ProjectMemberRow[];
  isOwner: boolean;
  isMember: boolean;
  myApplication?: {
    id: string;
    status: string;
    message?: string | null;
    createdAt?: string;
    decidedAt?: string | null;
    invitedById?: string | null;
    invitedBy?: User | null;
  } | null;
  applications?: ProjectApplication[];
  attachments?: ProjectAttachment[];
};

/** Заявка (GET /projects/:id для owner/ADMIN или список заявок). */
export type ProjectApplication = {
  id: string;
  projectId?: string;
  applicantId: string;
  /** Заполнено, если заявка создана как приглашение от владельца/админа. */
  invitedById?: string | null;
  invitedBy?: User | null;
  message: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | string;
  createdAt: string;
  decidedAt?: string | null;
  applicant: User & { skills?: Skill[] };
};

/** Ответ PUT /projects/:id (без isOwner / isMember / applications). */
export type ProjectUpdateResponse = Omit<
  ProjectDetail,
  "isOwner" | "isMember" | "myApplication" | "applications"
>;

/** Ответ POST /projects — без расширенных полей GET. */
export type ProjectCreatedPayload = Omit<
  ProjectDetail,
  "isOwner" | "isMember" | "myApplication" | "applications"
>;

export type ApplyToProjectBody = {
  message?: string;
};
