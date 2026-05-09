type LoadMoreProps = {
  text: string;
  isLoading: boolean;
  onActivate: () => void;
};

export function LoadMoreTrigger({
  text,
  isLoading,
  onActivate,
}: LoadMoreProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      }}
      aria-disabled={isLoading}
    >
      <span>{isLoading ? "Загрузка..." : text}</span>
    </div>
  );
}
