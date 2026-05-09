import { UserMinus, UserPlus } from "lucide-react";

import {
  useFollowUserMutation,
  useUnfollowUserMutation,
} from "@/features/follow/api/follow.api";
import { Button } from "@/shared/ui/kit/button";
import { Spinner } from "@/shared/ui/kit/spinner";

type FollowToggleButtonProps = {
  targetUserId: string;
  isFollowing: boolean;
};

export function FollowToggleButton({
  targetUserId,
  isFollowing,
}: FollowToggleButtonProps) {
  const [follow, { isLoading: followLoading }] = useFollowUserMutation();
  const [unfollow, { isLoading: unfollowLoading }] = useUnfollowUserMutation();

  const loading = followLoading || unfollowLoading;

  const handleClick = () => {
    if (loading) {
      return;
    }

    if (isFollowing) {
      void unfollow({ followingId: targetUserId });
    } else {
      void follow({ followingId: targetUserId });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading}
      aria-busy={loading}
      onClick={handleClick}
    >
      {loading ? (
        <Spinner data-icon="inline-start" />
      ) : isFollowing ? (
        <UserMinus className="size-4" aria-hidden />
      ) : (
        <UserPlus className="size-4" aria-hidden />
      )}
      {isFollowing ? "Отписаться" : "Подписаться"}
    </Button>
  );
}
