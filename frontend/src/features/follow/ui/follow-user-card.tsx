import { Link } from "react-router";

import { FollowToggleButton } from "./follow-toggle-button";

import type { User } from "@/features/auth";
import { displayPublicName, userInitials } from "@/features/auth";
import { toAbsoluteUploadUrl } from "@/features/posts/lib/format";
import { ROUTES } from "@/shared/model/routes";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/kit/avatar";

type FollowUserCardProps = {
  user: User;
  isFollowing: boolean;
};

export function FollowUserCard({ user, isFollowing }: FollowUserCardProps) {
  const title = displayPublicName(user);
  const profileHref = ROUTES.USER_DETAILS.replace(":userId", user.id);
  const avatarSrc = user.avatarUrl ? toAbsoluteUploadUrl(user.avatarUrl) : "";

  const initials = userInitials(user);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          to={profileHref}
          className="shrink-0 rounded-full outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Профиль: ${title}`}
        >
          <Avatar>
            <AvatarImage src={avatarSrc} alt="" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Link>
        <span className="min-w-0 truncate font-medium">{title}</span>
      </div>
      <FollowToggleButton targetUserId={user.id} isFollowing={isFollowing} />
    </div>
  );
}
