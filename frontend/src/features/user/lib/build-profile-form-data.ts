export type ProfileFormSubmitPayload = {
  firstName: string;
  lastName: string;
  patronymic: string;
  bio: string;
  university: string;
  course: string;
  faculty: string;
  contacts: string[];
  dateOfBirth: string;
  skillIds: string[];
  avatarFile?: File | null;
  resumeFile?: File | null;
  removeResume: boolean;
};

export function buildProfileFormData(
  payload: ProfileFormSubmitPayload
): FormData {
  const fd = new FormData();

  fd.append("firstName", payload.firstName.trim());
  fd.append("lastName", payload.lastName.trim());
  fd.append("patronymic", payload.patronymic.trim());
  fd.append("bio", payload.bio);
  fd.append("university", payload.university);
  fd.append("course", payload.course);
  fd.append("faculty", payload.faculty);

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

  fd.append("skillIds", payload.skillIds.join(","));

  return fd;
}
