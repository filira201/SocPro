import { Link, useParams } from "react-router";

import { useGetUserByIdQuery } from "@/features/auth";
import { toAbsoluteUploadUrl } from "@/features/posts/lib/format";
import { ROUTES } from "@/shared/model/routes";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/kit/avatar";
import { Spinner } from "@/shared/ui/kit/spinner";

function UserPage() {
  const { userId } = useParams();
  const { data: user, isLoading } = useGetUserByIdQuery(userId ?? "", {
    skip: !userId,
  });

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
      <div className="grid gap-4">
        <Link
          to={ROUTES.POSTS}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Назад к ленте
        </Link>
        {isLoading ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Spinner />
          </div>
        ) : null}
        {user ? (
          <article className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <Avatar size="lg">
              <AvatarImage
                src={user.avatarUrl ? toAbsoluteUploadUrl(user.avatarUrl) : ""}
                alt={user.username}
              />
              <AvatarFallback>
                {user.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Пользователь</p>
              <h1 className="text-lg font-semibold">@{user.username}</h1>
            </div>
          </article>
        ) : null}
        {!isLoading && !user ? (
          <p className="rounded-xl border bg-card p-4 text-center text-muted-foreground">
            Пользователь не найден
          </p>
        ) : null}
      </div>
    </section>
  );
}

export const Component = UserPage;
