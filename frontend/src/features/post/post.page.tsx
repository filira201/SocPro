import { useEffect } from "react";
import { href, useLocation, useNavigate, useParams } from "react-router";

import { parseCommentHash } from "@/features/post/lib/parse-comment-hash";
import { PostCard, useGetPostByIdQuery } from "@/features/posts";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import { Spinner } from "@/shared/ui/kit/spinner";

function PostPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { postId } = useParams();
  const { data: post, isLoading } = useGetPostByIdQuery(postId ?? "", {
    skip: !postId,
  });

  useEffect(() => {
    const commentId = parseCommentHash(location.hash ?? "");

    if (!commentId || !postId) {
      return;
    }

    navigate(href(ROUTES.POST_COMMENT, { postId, commentId }), {
      replace: true,
    });
  }, [location.hash, navigate, postId]);

  return (
    <section className="w-full max-w-3xl mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
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

        {post ? (
          <PostCard
            post={post}
            showCommentsInitially
            showOpenPostButton={false}
          />
        ) : null}

        {!isLoading && !post ? (
          <p className="rounded-xl border bg-card p-4 text-center text-muted-foreground">
            Пост не найден
          </p>
        ) : null}
      </div>
    </section>
  );
}

export const Component = PostPage;
