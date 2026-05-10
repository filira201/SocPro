import { X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useController, type Control } from "react-hook-form";

import type { ProfileEditFormValues } from "../model/profile-edit-schema";

import type { Skill, User } from "@/features/auth";
import {
  type SkillWithMatch,
  useCreateSkillMutation,
  useLazyListSkillsQuery,
} from "@/features/skills/api/skills.api";
import { useDebouncedValue } from "@/shared/lib/react/use-debounced-value";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/kit/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/shared/ui/kit/field";
import { Input } from "@/shared/ui/kit/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/kit/popover";
import { Spinner } from "@/shared/ui/kit/spinner";

const SEARCH_DEBOUNCE_MS = 320;
/** Первая страница и шаг подгрузки при прокрутке */
const PAGE_SIZE = 20;
/** Поиск по API с одного символа; пустая строка — первые навыки каталога */
const MIN_SEARCH_CHARS = 1;

type ProfileSkillsFieldProps = {
  control: Control<ProfileEditFormValues>;
  user: User;
  disabled?: boolean;
};

export function ProfileSkillsField({
  control,
  user,
  disabled,
}: ProfileSkillsFieldProps) {
  const {
    field,
    fieldState: { error },
  } = useController({
    control,
    name: "skillIds",
  });

  const skillIds = useMemo(() => field.value ?? [], [field.value]);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [supplementalNames, setSupplementalNames] = useState<
    Record<string, string>
  >({});
  const [createHint, setCreateHint] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [fuseChoice, setFuseChoice] = useState<{
    userInput: string;
    suggestion: SkillWithMatch;
  } | null>(null);

  const [mergedSkills, setMergedSkills] = useState<Skill[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const apiSkipRef = useRef(0);
  const loadMoreGuardRef = useRef(false);

  const [triggerSearch] = useLazyListSkillsQuery();

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadFirstPage = async () => {
      setInitialLoading(true);
      setMergedSkills([]);
      apiSkipRef.current = 0;
      setHasMore(true);

      const q =
        debouncedSearch.length >= MIN_SEARCH_CHARS ? debouncedSearch : "";

      try {
        const data = await triggerSearch({
          q,
          skip: 0,
          take: PAGE_SIZE,
        }).unwrap();

        if (cancelled) {
          return;
        }

        setMergedSkills(data);
        apiSkipRef.current = data.length;
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        if (!cancelled) {
          setMergedSkills([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    };

    void loadFirstPage();

    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch, triggerSearch]);

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (
        !open ||
        !hasMore ||
        initialLoading ||
        loadingMore ||
        loadMoreGuardRef.current
      ) {
        return;
      }

      const el = e.currentTarget;
      const threshold = 72;

      if (el.scrollHeight - el.scrollTop - el.clientHeight > threshold) {
        return;
      }

      loadMoreGuardRef.current = true;
      setLoadingMore(true);

      const qParam =
        debouncedSearch.length >= MIN_SEARCH_CHARS ? debouncedSearch : "";
      const skip = apiSkipRef.current;

      void (async () => {
        try {
          const data = await triggerSearch({
            q: qParam,
            skip,
            take: PAGE_SIZE,
          }).unwrap();

          setMergedSkills((prev) => {
            const seen = new Set(prev.map((s) => s.id));
            const extra = data.filter((s) => !seen.has(s.id));

            return [...prev, ...extra];
          });

          apiSkipRef.current = skip + data.length;
          setHasMore(data.length === PAGE_SIZE);
        } finally {
          setLoadingMore(false);
          loadMoreGuardRef.current = false;
        }
      })();
    },
    [open, hasMore, initialLoading, loadingMore, debouncedSearch, triggerSearch]
  );

  const idToName = useMemo(() => {
    const m = new Map<string, string>();
    user.skills?.forEach((s) => {
      m.set(s.id, s.name);
    });

    for (const [id, name] of Object.entries(supplementalNames)) {
      m.set(id, name);
    }

    return m;
  }, [user.skills, supplementalNames]);

  const addSkill = useCallback(
    (skill: Skill) => {
      const ids = field.value ?? [];

      if (ids.includes(skill.id)) {
        return;
      }

      if (ids.length >= 50) {
        return;
      }

      field.onChange([...ids, skill.id]);
      setSupplementalNames((prev) => ({ ...prev, [skill.id]: skill.name }));
    },
    [field]
  );

  const removeSkill = useCallback(
    (id: string) => {
      const ids = field.value ?? [];
      field.onChange(ids.filter((x) => x !== id));
      setSupplementalNames((prev) => {
        const next = { ...prev };
        delete next[id];

        return next;
      });
    },
    [field]
  );

  const [createSkill, { isLoading: isCreating }] = useCreateSkillMutation();

  const handleCreateCustom = async () => {
    const name = customName.trim();

    if (!name || disabled || isCreating || fuseChoice) {
      return;
    }

    setCreateHint(null);

    try {
      const created = await createSkill({ name }).unwrap();

      if (created.matchedBy === "fuse") {
        setFuseChoice({ userInput: name, suggestion: created });

        return;
      }

      const ids = field.value ?? [];

      if (!ids.includes(created.id)) {
        if (ids.length >= 50) {
          return;
        }

        field.onChange([...ids, created.id]);
      }

      setSupplementalNames((prev) => ({ ...prev, [created.id]: created.name }));

      if (created.matchedBy && created.matchedBy !== "created") {
        setCreateHint(`Сохранено как «${created.name}»`);
      }

      setCustomName("");
    } catch {
      setCreateHint("Не удалось добавить навык. Попробуйте ещё раз.");
    }
  };

  const fuseDialogBusy = Boolean(fuseChoice && isCreating);

  const handleFuseAccept = () => {
    if (!fuseChoice || disabled || fuseDialogBusy) {
      return;
    }

    addSkill(fuseChoice.suggestion);
    setCreateHint(`Сохранено как «${fuseChoice.suggestion.name}»`);
    setFuseChoice(null);
    setCustomName("");
  };

  const handleFuseOwn = async () => {
    if (!fuseChoice || disabled || fuseDialogBusy) {
      return;
    }

    setCreateHint(null);

    try {
      const created = await createSkill({
        name: fuseChoice.userInput,
        skipFuse: true,
      }).unwrap();
      const ids = field.value ?? [];

      if (!ids.includes(created.id)) {
        if (ids.length >= 50) {
          setFuseChoice(null);

          return;
        }

        field.onChange([...ids, created.id]);
      }

      setSupplementalNames((prev) => ({ ...prev, [created.id]: created.name }));

      if (created.matchedBy && created.matchedBy !== "created") {
        setCreateHint(`Сохранено как «${created.name}»`);
      }

      setFuseChoice(null);
      setCustomName("");
    } catch {
      setCreateHint("Не удалось добавить навык. Попробуйте ещё раз.");
    }
  };

  const pickedSet = useMemo(() => new Set(skillIds), [skillIds]);

  const visibleResults = useMemo(
    () => mergedSkills.filter((s) => !pickedSet.has(s.id)),
    [mergedSkills, pickedSet]
  );

  const showInitialSpinner = initialLoading && mergedSkills.length === 0;

  return (
    <Field data-invalid={!!error}>
      <FieldLabel>Навыки</FieldLabel>
      <FieldDescription>
        Найдите технологию в каталоге или добавьте свою — название будет
        приведено к общему виду на сервере.
      </FieldDescription>

      {skillIds.length ? (
        <ul className="mb-3 flex flex-wrap gap-2" aria-label="Выбранные навыки">
          {skillIds.map((id) => (
            <li
              key={id}
              className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/80 px-2.5 py-1 text-sm"
            >
              <span className="min-w-0 truncate">{idToName.get(id) ?? id}</span>
              <button
                type="button"
                className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => removeSkill(id)}
                disabled={disabled}
                aria-label={`Удалить навык ${idToName.get(id) ?? id}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);

            if (!next) {
              setSearch("");
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-start sm:w-auto"
              disabled={disabled || skillIds.length >= 50}
            >
              Добавить из каталога
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[min(100vw-2rem,22rem)] p-0"
            align="start"
          >
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Поиск или прокрутка списка…"
                value={search}
                onValueChange={setSearch}
                disabled={disabled}
              />
              <CommandList onScroll={handleListScroll}>
                {showInitialSpinner ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    Загрузка…
                  </div>
                ) : mergedSkills.length > 0 && visibleResults.length === 0 ? (
                  <CommandEmpty>
                    Все подходящие навыки уже добавлены в профиль
                  </CommandEmpty>
                ) : visibleResults.length === 0 ? (
                  <CommandEmpty>
                    {debouncedSearch.length >= MIN_SEARCH_CHARS
                      ? "Ничего не найдено"
                      : "В каталоге пока нет навыков"}
                  </CommandEmpty>
                ) : (
                  <CommandGroup heading="Каталог">
                    {visibleResults.map((skill) => (
                      <CommandItem
                        key={skill.id}
                        value={`${skill.id}-${skill.name}`}
                        onSelect={() => {
                          addSkill(skill);
                          setOpen(false);
                          setSearch("");
                        }}
                      >
                        {skill.name}
                      </CommandItem>
                    ))}
                    {loadingMore ? (
                      <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                        <Spinner className="size-3.5" />
                        Загрузка…
                      </div>
                    ) : null}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center">
          <Input
            className="h-11"
            placeholder="Свой навык, например Rust"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            disabled={disabled || skillIds.length >= 50}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreateCustom();
              }
            }}
            aria-label="Название нового навыка"
          />
          <Button
            type="button"
            variant="secondary"
            className="h-11 shrink-0"
            disabled={
              disabled ||
              isCreating ||
              Boolean(fuseChoice) ||
              !customName.trim() ||
              skillIds.length >= 50
            }
            onClick={() => void handleCreateCustom()}
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
      </div>

      {createHint ? (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {createHint}
        </p>
      ) : null}

      {error?.message ? <FieldError>{error.message}</FieldError> : null}

      <Dialog
        open={fuseChoice !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setFuseChoice(null);
          }
        }}
      >
        <DialogContent
          aria-busy={fuseDialogBusy}
          showCloseButton={!fuseDialogBusy}
          className="max-w-md"
        >
          {fuseChoice ? (
            <>
              <DialogHeader>
                <DialogTitle>Уточните навык</DialogTitle>
                <DialogDescription>
                  Сервер предполагает, что вы могли иметь в виду «
                  {fuseChoice.suggestion.name}». Вы ввели «
                  {fuseChoice.userInput}». Выберите вариант для сохранения в
                  профиле.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  type="button"
                  variant="default"
                  className="w-full"
                  disabled={disabled || fuseDialogBusy}
                  onClick={handleFuseAccept}
                >
                  «{fuseChoice.suggestion.name}» (как предложено)
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={disabled || fuseDialogBusy}
                  onClick={() => void handleFuseOwn()}
                >
                  {fuseDialogBusy ? (
                    <>
                      <Spinner data-icon="inline-start" className="size-4" />
                      Создание…
                    </>
                  ) : (
                    `«${fuseChoice.userInput}» (как вводили)`
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Field>
  );
}
