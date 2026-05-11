import { useEffect } from "react";
import { href, useNavigate, useParams } from "react-router";

import { UserProfileEditForm } from "./ui/user-profile-edit-form";

import { selectCurrentUser, useGetUserByIdQuery } from "@/features/auth";
import { useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
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
      navigate(href(ROUTES.USER_DETAILS, { userId }), {
        replace: true,
      });
    }
  }, [userId, currentUser, navigate]);

  const profileHref = userId
    ? href(ROUTES.USER_DETAILS, { userId })
    : ROUTES.POSTS;

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
