import { Button } from "@/shared/ui/kit/button";
import { Input } from "@/shared/ui/kit/input";
import { Spinner } from "@/shared/ui/kit/spinner";

type CustomSkillRowProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  disabled?: boolean;
  isCreating: boolean;
  blockedByFuseDialog: boolean;
  catalogBlocked: boolean;
};

export function CustomSkillRow({
  value,
  onChange,
  onSubmit,
  disabled,
  isCreating,
  blockedByFuseDialog,
  catalogBlocked,
}: CustomSkillRowProps) {
  const submitBlocked =
    Boolean(disabled) ||
    isCreating ||
    blockedByFuseDialog ||
    !value.trim() ||
    catalogBlocked;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center">
      <Input
        className="h-11"
        placeholder="Свой навык, например Rust"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || catalogBlocked}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void onSubmit();
          }
        }}
        aria-label="Название нового навыка"
      />
      <Button
        type="button"
        variant="secondary"
        className="h-11 shrink-0"
        disabled={submitBlocked}
        onClick={() => void onSubmit()}
      >
        {isCreating ? (
          <>
            <Spinner data-icon="inline-start" className="size-4" />
            Добавление…
          </>
        ) : (
          "Добавить навык"
        )}
      </Button>
    </div>
  );
}
