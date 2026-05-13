import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import { PostCard, useGetPostByIdQuery } from "@/features/posts";
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
    const raw = location.hash?.replace(/^#/, "").trim();

    if (!raw || !post) {
      return;
    }

    const timer = window.setTimeout(() => {
      document.getElementById(raw)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [location.hash, post]);

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
