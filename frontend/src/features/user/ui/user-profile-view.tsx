import { computeAge, formatRegistrationDate } from "../lib/format-profile";

import {
  displayPublicName,
  userInitials,
  type User,
} from "@/features/auth";
import { toAbsoluteUploadUrl } from "@/features/posts/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/kit/avatar";
import { Button } from "@/shared/ui/kit/button";


type UserProfileViewProps = {
  user: User;
  onEdit?: () => void;
};

function OptionalRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium">{value}</dd>
    </div>
  );
}

export function UserProfileView({ user, onEdit }: UserProfileViewProps) {
  const age = computeAge(user.dateOfBirth ?? null);
  const registrationLabel = formatRegistrationDate(user.createdAt);
  const publicTitle = displayPublicName(user);
  const initials = userInitials(user);

  const avatarSrc = user.avatarUrl ? toAbsoluteUploadUrl(user.avatarUrl) : "";

  return (
    <article className="grid gap-6 rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar size="lg">
            <AvatarImage src={avatarSrc} alt={publicTitle} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">
              Зарегистрирован {registrationLabel}
            </p>
            <h1 className="text-2xl font-semibold">{publicTitle}</h1>
          </div>
        </div>
        {onEdit ? (
          <Button type="button" variant="outline" onClick={onEdit}>
            Редактировать профиль
          </Button>
        ) : null}
      </div>

      <dl className="grid gap-3 text-sm">
        <OptionalRow label="Отчество" value={user.patronymic} />
        <OptionalRow label="О себе" value={user.bio} />
        {user.dateOfBirth ? (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 text-muted-foreground">Дата рождения</dt>
            <dd className="min-w-0 font-medium">
              {new Intl.DateTimeFormat("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(user.dateOfBirth))}
              {age !== null ? ` (${age} ${pluralYears(age)})` : null}
            </dd>
          </div>
        ) : null}
        <OptionalRow label="Учебное заведение" value={user.university} />
        <OptionalRow label="Курс" value={user.course} />
        <OptionalRow label="Факультет" value={user.faculty} />
        <OptionalRow label="Страна" value={user.country} />
        <OptionalRow label="Город" value={user.city} />
      </dl>

      {user.contacts?.length ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Контакты</h2>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {user.contacts.map((line, i) => (
              <li key={`${line}-${i}`} className="break-all">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {user.resumeUrl ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Резюме</h2>
          <a
            href={toAbsoluteUploadUrl(user.resumeUrl)}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Скачать{" "}
            {user.resumeOriginalName ? `(${user.resumeOriginalName})` : "файл"}
          </a>
        </section>
      ) : null}
    </article>
  );
}

function pluralYears(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod100 >= 11 && mod100 <= 14) {
    return "лет";
  }

  if (mod10 === 1) {
    return "год";
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return "года";
  }

  return "лет";
}
