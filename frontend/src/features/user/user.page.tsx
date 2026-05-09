import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import { UserProfileEditForm } from "./ui/user-profile-edit-form";
import { UserProfileView } from "./ui/user-profile-view";

import { selectCurrentUser, useGetUserByIdQuery } from "@/features/auth";
import { useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import { Spinner } from "@/shared/ui/kit/spinner";


function UserPage() {
  const { userId } = useParams();
  const currentUser = useAppSelector(selectCurrentUser);
  const [editing, setEditing] = useState(false);

  const { data: user, isLoading } = useGetUserByIdQuery(userId ?? "", {
    skip: !userId,
  });

  const isOwner = Boolean(
    userId && currentUser?.id && currentUser.id === userId
  );

  useEffect(() => {
    setEditing(false);
  }, [userId]);

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

        {user && editing && isOwner ? (
          <UserProfileEditForm
            user={user}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        ) : null}

        {user && (!editing || !isOwner) ? (
          <UserProfileView
            user={user}
            onEdit={isOwner ? () => setEditing(true) : undefined}
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
