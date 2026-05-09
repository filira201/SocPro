/** Только буквы кириллицы (совпадает с правилами backend) */
export const CYRILLIC_FIO_PART_REGEX = /^[\p{Script=Cyrillic}]+$/u;

export type PublicNameUser = {
  firstName: string;
  lastName?: string | null;
};

export type FullNameUser = PublicNameUser & {
  patronymic?: string | null;
};

/** ФИО в порядке: фамилия, имя, отчество; пустые части пропускаются. */
export function formatFullName(user: FullNameUser): string {
  const ln = user.lastName?.trim() ?? "";
  const fn = user.firstName?.trim() ?? "";
  const pt = user.patronymic?.trim() ?? "";

  return [ln, fn, pt].filter(Boolean).join(" ");
}

export function displayPublicName(user: PublicNameUser): string {
  const fn = user.firstName?.trim() ?? "";
  const ln = user.lastName?.trim() ?? "";
  const joined = [fn, ln].filter(Boolean).join(" ").trim();

  return joined || fn;
}

export function userInitials(user: PublicNameUser): string {
  const fn = user.firstName?.trim() ?? "";
  const ln = user.lastName?.trim() ?? "";

  if (fn && ln) {
    return `${fn.slice(0, 1)}${ln.slice(0, 1)}`.toUpperCase();
  }

  return fn.slice(0, 2).toUpperCase() || "?";
}
