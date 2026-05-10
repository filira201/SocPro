import { Plus } from "lucide-react";

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
    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <Input
        className="h-11 min-w-0 w-full sm:flex-1"
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
        className="h-11 w-full shrink-0 sm:w-auto"
        disabled={submitBlocked}
        onClick={() => void onSubmit()}
      >
        {isCreating ? (
          <>
            <Spinner data-icon="inline-start" className="size-4" />
            Добавление…
          </>
        ) : (
          <>
            <Plus data-icon="inline-start" className="size-4" aria-hidden />
            Добавить навык
          </>
        )}
      </Button>
    </div>
  );
}
