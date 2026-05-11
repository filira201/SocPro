import { X } from "lucide-react";

type SelectedSkillsChipsProps = {
  skillIds: string[];
  getDisplayName: (id: string) => string;
  onRemove: (id: string) => void;
  disabled?: boolean;
};

export function SelectedSkillsChips({
  skillIds,
  getDisplayName,
  onRemove,
  disabled,
}: SelectedSkillsChipsProps) {
  if (!skillIds.length) {
    return null;
  }

  return (
    <ul className="mb-3 flex flex-wrap gap-2" aria-label="Выбранные навыки">
      {skillIds.map((id) => (
        <li
          key={id}
          className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/80 px-2.5 py-1 text-sm"
        >
          <span className="min-w-0 truncate">{getDisplayName(id)}</span>
          <button
            type="button"
            className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onRemove(id)}
            disabled={disabled}
            aria-label={`Удалить навык ${getDisplayName(id)}`}
          >
            <X className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
