export type Skill = {
  id: string;
  name: string;
  aliases?: Array<{ id: string; key: string }>;
};

export type User = {
  id: string;
  email?: string;
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
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  followers?: Array<{ follower: User }>;
  following?: Array<{ following: User }>;
  skills?: Skill[];
};
