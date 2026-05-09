export type ProfileFormSubmitPayload = {
  username: string;
  bio: string;
  location: string;
  university: string;
  course: string;
  faculty: string;
  country: string;
  city: string;
  contacts: string[];
  /** YYYY-MM-DD или пустая строка для сброса */
  dateOfBirth: string;
  avatarFile?: File | null;
  resumeFile?: File | null;
  removeResume: boolean;
};

export function buildProfileFormData(
  payload: ProfileFormSubmitPayload
): FormData {
  const fd = new FormData();

  fd.append("username", payload.username.trim());
  fd.append("bio", payload.bio);
  fd.append("location", payload.location);
  fd.append("university", payload.university);
  fd.append("course", payload.course);
  fd.append("faculty", payload.faculty);
  fd.append("country", payload.country);
  fd.append("city", payload.city);

  fd.append(
    "contacts",
    JSON.stringify(payload.contacts.map((c) => c.trim()).filter(Boolean))
  );

  fd.append("dateOfBirth", payload.dateOfBirth);

  if (payload.avatarFile) {
    fd.append("avatar", payload.avatarFile);
  }

  if (payload.resumeFile) {
    fd.append("resume", payload.resumeFile);
  }

  if (payload.removeResume) {
    fd.append("removeResume", "true");
  }

  return fd;
}
