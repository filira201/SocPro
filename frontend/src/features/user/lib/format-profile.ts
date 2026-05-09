import { differenceInYears, parse, startOfDay } from "date-fns";

export function formatRegistrationDate(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** ISO-дата рождения (YYYY-MM-DD или полный ISO от API). */
export function computeAge(dateOfBirthIso: string | null): number | null {
  if (!dateOfBirthIso) {
    return null;
  }

  try {
    const raw = dateOfBirthIso.slice(0, 10);
    const birth = startOfDay(parse(raw, "yyyy-MM-dd", new Date()));

    if (Number.isNaN(birth.getTime())) {
      return null;
    }

    const today = startOfDay(new Date());

    return differenceInYears(today, birth);
  } catch {
    return null;
  }
}

export function parseBirthDateToInput(iso: string | null): string {
  if (!iso) {
    return "";
  }

  return iso.slice(0, 10);
}
