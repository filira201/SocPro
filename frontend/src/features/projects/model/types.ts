import type { Skill, User } from "@/features/auth";

/** Ответ списка проектов (GET /projects). */
export type ProjectsListResponse = {
  items: ProjectListItem[];
  total: number;
  take: number;
  skip: number;
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
  };
};

/** Участник проекта (GET /projects/:id, POST /projects). */
export type ProjectMemberRow = {
  id: string;
  userId: string;
  role: string;
  joinedAt?: string;
  user: User;
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
  } | null;
  applications?: ProjectApplication[];
};

/** Заявка (GET /projects/:id для owner/ADMIN или список заявок). */
export type ProjectApplication = {
  id: string;
  projectId?: string;
  applicantId: string;
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

export type UpdateProjectBody = {
  title: string;
  description: string;
  goals: string;
  status?: string;
  acceptingApplications?: boolean;
  requiredSkillIds?: string[];
};

/** Ответ POST /projects — без расширенных полей GET. */
export type ProjectCreatedPayload = Omit<
  ProjectDetail,
  "isOwner" | "isMember" | "myApplication" | "applications"
>;

export type CreateProjectBody = {
  title: string;
  description: string;
  goals: string;
  requiredSkillIds?: string[];
};

export type ApplyToProjectBody = {
  message?: string;
};
