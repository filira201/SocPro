import { useParams } from "react-router";

import { FollowUserCard, useGetUserFollowingQuery } from "@/features/follow";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { Spinner } from "@/shared/ui/kit/spinner";

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function FollowingPage() {
  const { userId } = useParams();

  const skip = !userId || !OBJECT_ID_REGEX.test(userId);

  const { data, isLoading, error } = useGetUserFollowingQuery(userId ?? "", {
    skip,
  });

  const list = data?.items ?? [];
  const globalError = getApiErrorMessage(error);

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-6 sm:px-4">
      <h1 className="text-xl font-semibold sm:text-2xl">Подписки</h1>

      {globalError ? (
        <p className="mt-4 text-destructive" role="alert">
          {globalError}
        </p>
      ) : null}

      {skip ? (
        <p className="mt-4 text-muted-foreground">Некорректная ссылка</p>
      ) : null}

      {!skip && isLoading ? (
        <div className="mt-8 flex justify-center text-muted-foreground">
          <Spinner />
        </div>
      ) : null}

      {!skip && !isLoading && !globalError && list.length === 0 ? (
        <p className="mt-4 text-muted-foreground">
          Этот пользователь пока ни на кого не подписан
        </p>
      ) : null}

      {!skip && !isLoading && list.length > 0 ? (
        <ul className="mt-6 grid gap-3">
          {list.map((item) => (
            <li key={item.id}>
              <FollowUserCard user={item} isFollowing={item.isFollowing} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export const Component = FollowingPage;
