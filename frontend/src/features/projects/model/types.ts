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
