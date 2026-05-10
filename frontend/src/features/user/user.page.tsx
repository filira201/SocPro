import { href, Link, useParams } from "react-router";

import { UserProfileView } from "./ui/user-profile-view";

import { selectCurrentUser, useGetUserByIdQuery } from "@/features/auth";
import { FollowToggleButton } from "@/features/follow";
import { useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import { Spinner } from "@/shared/ui/kit/spinner";

function UserPage() {
  const { userId } = useParams();

  const currentUser = useAppSelector(selectCurrentUser);

  const { data: user, isLoading } = useGetUserByIdQuery(userId ?? "", {
    skip: !userId,
  });

  const isOwner = Boolean(
    userId && currentUser?.id && currentUser.id === userId
  );

  const editHref =
    user && isOwner
      ? href(ROUTES.USER_PROFILE_EDIT, { userId: user.id })
      : undefined;

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
      <div className="grid gap-4">
        <Link
          to={ROUTES.POSTS}
          className="w-fit justify-self-start text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Назад к ленте
        </Link>

        {isLoading ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Spinner />
          </div>
        ) : null}

        {user ? (
          <UserProfileView
            user={user}
            editProfileHref={editHref}
            followAction={
              !isOwner ? (
                <FollowToggleButton
                  targetUserId={user.id}
                  isFollowing={Boolean(user.isFollowing)}
                />
              ) : undefined
            }
          />
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
