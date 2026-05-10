import { Search } from "lucide-react";

import { LOADING_MESSAGE, MIN_SEARCH_CHARS } from "../model/constants";

import type { Skill } from "@/features/auth";
import { Button } from "@/shared/ui/kit/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/kit/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/kit/popover";
import { Spinner } from "@/shared/ui/kit/spinner";

type SkillsCatalogPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
  debouncedSearch: string;
  mergedSkillsCount: number;
  visibleSkills: Skill[];
  onListScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  showInitialSpinner: boolean;
  loadingMore: boolean;
  onPick: (skill: Skill) => void;
  disabled?: boolean;
  catalogBlocked: boolean;
};

export function SkillsCatalogPopover({
  open,
  onOpenChange,
  search,
  onSearchChange,
  debouncedSearch,
  mergedSkillsCount,
  visibleSkills,
  onListScroll,
  showInitialSpinner,
  loadingMore,
  onPick,
  disabled,
  catalogBlocked,
}: SkillsCatalogPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-start sm:w-auto"
          disabled={disabled || catalogBlocked}
        >
          <Search data-icon="inline-start" className="size-4" aria-hidden />
          Добавить из каталога
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Поиск или прокрутка списка…"
            value={search}
            onValueChange={onSearchChange}
            disabled={disabled}
          />
          <CommandList onScroll={onListScroll}>
            {showInitialSpinner ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                {LOADING_MESSAGE}
              </div>
            ) : mergedSkillsCount > 0 && visibleSkills.length === 0 ? (
              <CommandEmpty>
                Все подходящие навыки уже добавлены в профиль
              </CommandEmpty>
            ) : visibleSkills.length === 0 ? (
              <CommandEmpty>
                {debouncedSearch.length >= MIN_SEARCH_CHARS
                  ? "Ничего не найдено"
                  : "В каталоге пока нет навыков"}
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Каталог">
                {visibleSkills.map((skill) => (
                  <CommandItem
                    key={skill.id}
                    value={`${skill.id}-${skill.name}`}
                    onSelect={() => onPick(skill)}
                  >
                    {skill.name}
                  </CommandItem>
                ))}
                {loadingMore ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                    <Spinner className="size-3.5" />
                    {LOADING_MESSAGE}
                  </div>
                ) : null}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
