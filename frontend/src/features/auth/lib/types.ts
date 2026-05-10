export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  patronymic: string | null;
  avatarUrl: string | null;
  bio: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  updatedAt?: string;
  contacts?: string[];
  university?: string | null;
  course?: string | null;
  faculty?: string | null;
  resumeUrl?: string | null;
  resumeOriginalName?: string | null;
  resumeMimeType?: string | null;
  resumeSize?: number | null;
  /** GET /users/:id и GET /current */
  followersCount?: number;
  followingCount?: number;
  /** Только в ответе GET /users/:id */
  isFollowing?: boolean;
  /** GET /current — связи подписок */
  followers?: Array<{ follower: User }>;
  following?: Array<{ following: User }>;
};
