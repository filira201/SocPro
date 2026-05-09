import { useState } from "react";
import { Link } from "react-router";

import { computeAge, formatRegistrationDate } from "../lib/format-profile";

import {
  displayPublicName,
  formatFullName,
  userInitials,
  type User,
} from "@/features/auth";
import { toAbsoluteUploadUrl } from "@/features/posts/lib/format";
import { ImagePreviewModal } from "@/shared/ui/image-preview-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/kit/avatar";
import { Button } from "@/shared/ui/kit/button";

type UserProfileViewProps = {
  user: User;
  /** Ссылка на страницу редактирования профиля (только для владельца) */
  editProfileHref?: string;
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

export function UserProfileView({
  user,
  editProfileHref,
}: UserProfileViewProps) {
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const age = computeAge(user.dateOfBirth ?? null);
  const registrationLabel = formatRegistrationDate(user.createdAt);
  const publicTitle = displayPublicName(user);
  const initials = userInitials(user);

  const avatarSrc = user.avatarUrl ? toAbsoluteUploadUrl(user.avatarUrl) : "";

  return (
    <article className="grid gap-6 rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {user.avatarUrl ? (
            <>
              <button
                type="button"
                className="shrink-0 rounded-full p-0 outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => setIsAvatarPreviewOpen(true)}
                aria-label="Открыть фото профиля"
              >
                <Avatar size="lg">
                  <AvatarImage src={avatarSrc} alt={publicTitle} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </button>
              <ImagePreviewModal
                open={isAvatarPreviewOpen}
                onOpenChange={setIsAvatarPreviewOpen}
                title="Просмотр фото профиля пользователя"
                sources={[{ src: avatarSrc, alt: publicTitle }]}
              />
            </>
          ) : (
            <Avatar size="lg">
              <AvatarImage src={avatarSrc} alt={publicTitle} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          )}
          <div className="grid gap-1">
            <p className="text-sm text-muted-foreground">
              Зарегистрирован {registrationLabel}
            </p>
            <h1 className="text-2xl font-semibold">{publicTitle}</h1>
          </div>
        </div>
        {editProfileHref ? (
          <Button type="button" variant="outline" asChild>
            <Link to={editProfileHref}>Редактировать профиль</Link>
          </Button>
        ) : null}
      </div>

      <dl className="grid gap-3 text-sm">
        <OptionalRow label="ФИО" value={formatFullName(user)} />
        {age !== null ? (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 text-muted-foreground">Возраст</dt>
            <dd className="min-w-0 font-medium">
              {age} {pluralYears(age)}
            </dd>
          </div>
        ) : null}
        {user.dateOfBirth ? (
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
            <dt className="shrink-0 text-muted-foreground">Дата рождения</dt>
            <dd className="min-w-0 font-medium">
              {new Intl.DateTimeFormat("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(user.dateOfBirth))}
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
          <h2 className="text-sm font-medium text-muted-foreground">
            Контакты
          </h2>
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
            className="w-fit justify-self-start text-sm font-medium text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
            target="_blank"
            rel="noreferrer"
          >
            {user.resumeOriginalName ?? "Файл"}
          </a>
        </section>
      ) : null}

      {user.bio?.trim() ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">О себе</h2>
          <p className="whitespace-pre-wrap text-sm">{user.bio.trim()}</p>
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
