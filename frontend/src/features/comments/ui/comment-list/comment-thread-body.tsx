import { Link } from "react-router";

import type { Attachment } from "../../model/types";

import { AttachmentList } from "@/features/posts/ui/attachment-list";
import { ROUTES } from "@/shared/model/routes";

type CommentThreadBodyProps = {
  mentionContent: string;
  replyToUserId: string | null | undefined;
  replyToUsername: string | null | undefined;
  attachments: Attachment[];
};

export function CommentThreadBody({
  mentionContent,
  replyToUserId,
  replyToUsername,
  attachments,
}: CommentThreadBodyProps) {
  return (
    <>
      {mentionContent || (replyToUserId && replyToUsername) ? (
        <p className="mt-2 whitespace-pre-wrap text-sm">
          {replyToUserId && replyToUsername ? (
            <>
              <Link
                to={ROUTES.USER_DETAILS.replace(":userId", replyToUserId)}
                className="font-medium text-sky-600 hover:underline dark:text-sky-400"
              >
                @{replyToUsername}
              </Link>
              <span>, </span>
            </>
          ) : null}
          {mentionContent}
        </p>
      ) : null}
      <div className="mt-2">
        <AttachmentList attachments={attachments} />
      </div>
    </>
  );
}
