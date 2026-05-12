import { useState } from "react";

import { ProfileInviteProjectsDialog } from "./profile-invite-projects-dialog";

import { displayPublicName, type User } from "@/features/auth";
import { useGetManagedProjectsListQuery } from "@/features/projects/api/projects.api";
import { Button } from "@/shared/ui/kit/button";

type UserProfileInviteBlockProps = {
  inviteeUser: User;
};

/** Кнопка «Заявки» и диалог приглашений; монтировать с `key={user.id}` на странице профиля. */
export function UserProfileInviteBlock({
  inviteeUser,
}: UserProfileInviteBlockProps) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const { data: managedProbe } = useGetManagedProjectsListQuery(
    { inviteeId: inviteeUser.id, limit: 1 },
    { skip: !inviteeUser.id }
  );

  const showButton = Boolean(managedProbe?.items?.length);

  if (!showButton) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setInviteDialogOpen(true)}
      >
        Заявки
      </Button>
      <ProfileInviteProjectsDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        inviteeId={inviteeUser.id}
        inviteePublicTitle={displayPublicName(inviteeUser)}
      />
    </>
  );
}
