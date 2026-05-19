import { SearchIcon } from "lucide-react";
import { useParams } from "react-router";

import { selectCurrentUser } from "@/features/auth";
import { useFollowListSearchUrl } from "@/features/follow/lib/use-follow-list-url";
import { FollowUsersInfiniteList } from "@/features/follow/ui/follow-users-infinite-list";
import { useAppSelector } from "@/shared/lib/redux";
import { Input } from "@/shared/ui/kit/input";

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function FollowingPage() {
  const { userId } = useParams();
  const { qFromUrl, queryInput, setQueryInput, listResetKey } =
    useFollowListSearchUrl();
  const currentUser = useAppSelector(selectCurrentUser);

  const skip = !userId || !OBJECT_ID_REGEX.test(userId);
  const isOwnList = Boolean(
    userId && currentUser?.id && currentUser.id === userId
  );

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
      <h1 className="text-xl font-semibold sm:text-2xl">Подписки</h1>

      {skip ? (
        <p className="mt-4 text-muted-foreground">Некорректная ссылка</p>
      ) : (
        <>
          <div className="relative mt-4 w-full min-w-0">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="h-10 w-full pl-9"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Поиск по имени, фамилии или отчеству…"
              aria-label="Поиск подписок по ФИО"
              maxLength={200}
            />
          </div>

          <FollowUsersInfiniteList
            key={`${userId}-${listResetKey}`}
            userId={userId}
            kind="following"
            qFromUrl={qFromUrl}
            emptyMessage={
              qFromUrl
                ? "Никого не найдено по заданному запросу"
                : isOwnList
                  ? "Вы пока ни на кого не подписаны"
                  : "Этот пользователь пока ни на кого не подписан"
            }
          />
        </>
      )}
    </section>
  );
}

export const Component = FollowingPage;
