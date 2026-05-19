import { href, useNavigate, useParams } from "react-router";

import { CommentFocusCard } from "./ui/comment-focus-card";

import { useGetCommentFocusQuery } from "@/features/comments";
import { getApiErrorMessage } from "@/shared/lib/api-error";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import { Spinner } from "@/shared/ui/kit/spinner";

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function mapFocusErrorMessage(apiMessage: string) {
  if (apiMessage === "Пост не найден") {
    return "Публикация уже удалена";
  }

  if (apiMessage === "Комментарий не найден") {
    return "Комментарий или ответ уже удалён";
  }

  if (apiMessage === "Некорректная ссылка") {
    return "Некорректная ссылка";
  }

  return apiMessage || "Комментарий или ответ уже удалён";
}

function CommentFocusPage() {
  const navigate = useNavigate();
  const { postId = "", commentId = "" } = useParams();
  const idsValid =
    OBJECT_ID_REGEX.test(postId) && OBJECT_ID_REGEX.test(commentId);

  const {
    data: focus,
    isLoading,
    isFetching,
    isError,
    error: focusError,
  } = useGetCommentFocusQuery({ postId, commentId }, { skip: !idsValid });

  const isPending = !idsValid || isLoading || isFetching;

  if (!idsValid) {
    return (
      <FocusPageShell onBack={() => navigate(-1)}>
        <ErrorCard message="Некорректная ссылка" />
      </FocusPageShell>
    );
  }

  if (isPending) {
    return (
      <FocusPageShell onBack={() => navigate(-1)} postId={postId}>
        <div className="flex justify-center py-12 text-muted-foreground">
          <Spinner />
        </div>
      </FocusPageShell>
    );
  }

  if (isError || !focus) {
    const apiMessage = getApiErrorMessage(
      focusError as Parameters<typeof getApiErrorMessage>[0],
      "Комментарий или ответ уже удалён"
    );
    const message = mapFocusErrorMessage(apiMessage);
    const postExists = apiMessage !== "Пост не найден";

    return (
      <FocusPageShell
        onBack={() => navigate(-1)}
        postId={postExists ? postId : undefined}
      >
        <ErrorCard message={message} />
      </FocusPageShell>
    );
  }

  const pageTitle = focus.comment.parentId ? "Ответ" : "Комментарий";

  return (
    <FocusPageShell onBack={() => navigate(-1)} postId={focus.postId}>
      <h1 className="text-lg font-semibold">{pageTitle}</h1>

      {focus.ancestors.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">В ответ на</p>
          {focus.ancestors.map((ancestor) => (
            <CommentFocusCard
              key={ancestor.id}
              comment={ancestor}
              variant="ancestor"
            />
          ))}
        </div>
      ) : null}

      <CommentFocusCard comment={focus.comment} variant="target" />
    </FocusPageShell>
  );
}

function FocusPageShell({
  children,
  onBack,
  postId,
}: {
  children: React.ReactNode;
  onBack: () => void;
  postId?: string;
}) {
  const navigate = useNavigate();

  return (
    <section className="w-full max-w-3xl mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground"
            onClick={onBack}
          >
            Назад
          </Button>
          {postId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(href(ROUTES.POST_DETAILS, { postId }))}
            >
              К посту
            </Button>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <p className="rounded-xl border bg-card p-4 text-center text-muted-foreground">
      {message}
    </p>
  );
}

export const Component = CommentFocusPage;
