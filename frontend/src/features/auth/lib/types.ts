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
};
