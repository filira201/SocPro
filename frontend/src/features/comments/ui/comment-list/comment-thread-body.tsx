import { href, Link } from "react-router";

import type { Attachment } from "../../model/types";

import { AttachmentList } from "@/features/posts/ui/attachment-list";
import { ROUTES } from "@/shared/model/routes";

type CommentThreadBodyProps = {
  mentionContent: string;
  replyToUserId: string | null | undefined;
  replyToDisplayName: string | null | undefined;
  attachments: Attachment[];
};

export function CommentThreadBody({
  mentionContent,
  replyToUserId,
  replyToDisplayName,
  attachments,
}: CommentThreadBodyProps) {
  return (
    <>
      {mentionContent || (replyToUserId && replyToDisplayName) ? (
        <p className="mt-2 whitespace-pre-wrap text-sm">
          {replyToUserId && replyToDisplayName ? (
            <>
              <Link
                to={href(ROUTES.USER_DETAILS, { userId: replyToUserId })}
                className="font-medium text-sky-600 hover:underline dark:text-sky-400"
              >
                {replyToDisplayName}
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
