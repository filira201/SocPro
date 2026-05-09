export type User = {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  updatedAt?: string;
  contacts?: string[];
  university?: string | null;
  course?: string | null;
  faculty?: string | null;
  country?: string | null;
  city?: string | null;
  resumeUrl?: string | null;
  resumeOriginalName?: string | null;
  resumeMimeType?: string | null;
  resumeSize?: number | null;
  /** Только в ответе GET /users/:id */
  isFollowing?: boolean;
};
