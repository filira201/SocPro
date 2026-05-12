import { ChevronRight } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { href, useNavigate, useParams } from "react-router";

import { UserProfileInviteBlock } from "./ui/user-profile-invite-block";
import { UserProfileView } from "./ui/user-profile-view";

import { selectCurrentUser, useGetUserByIdQuery } from "@/features/auth";
import { FollowToggleButton } from "@/features/follow";
import { cn } from "@/shared/lib/css";
import { useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import { Spinner } from "@/shared/ui/kit/spinner";

const UserProfileProjectsLazyPanel = lazy(
  () => import("./ui/user-profile-projects-lazy-panel")
);

function UserPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [showProfileProjects, setShowProfileProjects] = useState(false);

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
        <Button
          type="button"
          variant="ghost"
          className="w-fit justify-self-start text-muted-foreground"
          onClick={() => navigate(-1)}
        >
          Назад
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Spinner />
          </div>
        ) : null}

        {user ? (
          <>
            <UserProfileView
              user={user}
              editProfileHref={editHref}
              followAction={
                !isOwner ? (
                  <div
                    key={user.id}
                    className="flex flex-col items-end gap-2 sm:flex-row sm:items-center"
                  >
                    <FollowToggleButton
                      targetUserId={user.id}
                      isFollowing={Boolean(user.isFollowing)}
                    />
                    <UserProfileInviteBlock inviteeUser={user} />
                  </div>
                ) : undefined
              }
            />

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-2 "
                aria-expanded={showProfileProjects}
                onClick={() => setShowProfileProjects((v) => !v)}
              >
                <span>
                  {showProfileProjects
                    ? "Скрыть проекты в участии"
                    : "Показать проекты в участии"}
                </span>
                <ChevronRight
                  className={cn(
                    "size-4 shrink-0 transition-transform",
                    showProfileProjects && "rotate-90"
                  )}
                  aria-hidden
                />
              </Button>

              {showProfileProjects ? (
                <Suspense
                  fallback={
                    <div className="mt-4 flex justify-center py-8 text-muted-foreground">
                      <Spinner />
                    </div>
                  }
                >
                  <UserProfileProjectsLazyPanel
                    profileUserId={user.id}
                    viewerId={currentUser?.id}
                  />
                </Suspense>
              ) : null}
            </div>
          </>
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
