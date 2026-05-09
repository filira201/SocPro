import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { UserProfileEditForm } from "./ui/user-profile-edit-form";

import { selectCurrentUser, useGetUserByIdQuery } from "@/features/auth";
import { useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import { Spinner } from "@/shared/ui/kit/spinner";

function UserProfileEditPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const currentUser = useAppSelector(selectCurrentUser);

  const { data: user, isLoading } = useGetUserByIdQuery(userId ?? "", {
    skip: !userId,
  });

  useEffect(() => {
    if (!userId || !currentUser) {
      return;
    }

    if (currentUser.id !== userId) {
      navigate(ROUTES.USER_DETAILS.replace(":userId", userId), {
        replace: true,
      });
    }
  }, [userId, currentUser, navigate]);

  const profileHref = userId
    ? ROUTES.USER_DETAILS.replace(":userId", userId)
    : ROUTES.POSTS;

  return (
    <section className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
      <div className="grid gap-4">
        <Link
          to={profileHref}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Назад к профилю
        </Link>

        {isLoading ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Spinner />
          </div>
        ) : null}

        {user && currentUser?.id === userId ? (
          <UserProfileEditForm
            user={user}
            onCancel={() => navigate(profileHref)}
            onSaved={() => navigate(profileHref)}
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

export const Component = UserProfileEditPage;
