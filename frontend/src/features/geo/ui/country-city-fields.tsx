import { ChevronDownIcon, Loader2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Controller,
  type Control,
  type FieldErrors,
  useWatch,
  type UseFormSetValue,
} from "react-hook-form";

import {
  useListCountriesQuery,
  useSearchCitiesQuery,
} from "@/features/geo/api/geo.api";
import type { ProfileEditFormValues } from "@/features/user/model/profile-edit-schema";
import { cn } from "@/shared/lib/css";
import { useDebouncedValue } from "@/shared/lib/react/use-debounced-value";
import { Button } from "@/shared/ui/kit/button";
import { Field, FieldError, FieldLabel } from "@/shared/ui/kit/field";
import { Input } from "@/shared/ui/kit/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/kit/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/kit/select";

type CountryCityFieldsProps = {
  control: Control<ProfileEditFormValues>;
  setValue: UseFormSetValue<ProfileEditFormValues>;
  errors: FieldErrors<ProfileEditFormValues>;
};

export function CountryCityFields({
  control,
  setValue,
  errors,
}: CountryCityFieldsProps) {
  const { data: countries = [], isLoading: countriesLoading } =
    useListCountriesQuery();

  const countryName = useWatch({ control, name: "country" }) ?? "";

  const countryRow = useMemo(
    () =>
      countries.find(
        (c) => c.name === countryName || c.nameEn === countryName,
      ),
    [countries, countryName],
  );

  const countryCode = countryRow?.code ?? null;

  const [cityOpen, setCityOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const debouncedCityQuery = useDebouncedValue(cityQuery, 300);

  const citySearchOk =
    Boolean(countryCode) && debouncedCityQuery.trim().length >= 2;

  const { data: citiesResult, isFetching: citiesFetching } =
    useSearchCitiesQuery(
      {
        countryCode: countryCode ?? "",
        q: debouncedCityQuery.trim(),
        limit: 25,
      },
      { skip: !citySearchOk },
    );

  const cityItems = citiesResult?.items ?? [];

  return (
    <>
      <Field data-invalid={!!errors.country}>
        <FieldLabel htmlFor="profile-country-select">Страна</FieldLabel>
        <Controller
          name="country"
          control={control}
          render={({ field }) => {
            const row = countries.find(
              (c) => c.name === field.value || c.nameEn === field.value,
            );

            if (countriesLoading) {
              return (
                <div
                  id="profile-country-select"
                  className={cn(
                    "flex h-8 w-full min-w-0 items-center rounded-md border border-input bg-transparent px-2.5 text-sm",
                    field.value ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span className="truncate">
                    {field.value
                      ? field.value
                      : "Загрузка списка стран…"}
                  </span>
                </div>
              );
            }

            return (
              <Select
                disabled={countriesLoading}
                value={row?.code}
                onValueChange={(code) => {
                  const next = countries.find((c) => c.code === code);

                  field.onChange(next?.name ?? "");
                  setValue("city", "", {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  setCityQuery("");
                }}
              >
                <SelectTrigger
                  id="profile-country-select"
                  aria-invalid={Boolean(errors.country)}
                  className={cn("h-8 w-full min-w-0 max-w-none bg-transparent")}
                >
                  <SelectValue placeholder="Выберите страну" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-72">
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }}
        />
        {countriesLoading ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2Icon className="size-3 animate-spin" />
            Загрузка списка стран…
          </p>
        ) : null}
        {errors.country?.message ? (
          <FieldError>{errors.country.message}</FieldError>
        ) : null}
      </Field>

      <Field data-invalid={!!errors.city}>
        <FieldLabel htmlFor="profile-city-search">Город</FieldLabel>
        <Controller
          name="city"
          control={control}
          render={({ field }) => (
            <Popover
              open={cityOpen}
              onOpenChange={(open) => {
                setCityOpen(open);

                if (!open) {
                  setCityQuery("");
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  id="profile-city-search"
                  type="button"
                  variant="outline"
                  disabled={!countryCode}
                  aria-invalid={Boolean(errors.city)}
                  className={cn(
                    "h-8 w-full min-w-0 justify-between px-2.5 font-normal",
                    !field.value && "text-muted-foreground",
                  )}
                >
                  <span className="truncate">
                    {field.value || "Выберите город"}
                  </span>
                  <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[min(100vw-2rem,var(--radix-popover-trigger-width))] p-2"
                align="start"
              >
                {!countryCode ? (
                  <p className="text-sm text-muted-foreground">
                    Сначала выберите страну.
                  </p>
                ) : (
                  <>
                    <Input
                      autoComplete="off"
                      placeholder="Начните вводить название…"
                      value={cityQuery}
                      onChange={(e) => {
                        setCityQuery(e.target.value);
                      }}
                      className="h-8"
                    />
                    <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-border/80">
                      {!citySearchOk ? (
                        <p className="p-2 text-xs text-muted-foreground">
                          Введите не менее 2 символов.
                        </p>
                      ) : citiesFetching ? (
                        <p className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                          <Loader2Icon className="size-4 animate-spin" />
                          Поиск…
                        </p>
                      ) : cityItems.length === 0 ? (
                        <p className="p-2 text-sm text-muted-foreground">
                          Ничего не найдено.
                        </p>
                      ) : (
                        <ul className="divide-y divide-border/60">
                          {cityItems.map((item) => (
                            <li key={item.geonameId}>
                              <button
                                type="button"
                                className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                                onClick={() => {
                                  field.onChange(item.name);
                                  setCityOpen(false);
                                  setCityQuery("");
                                }}
                              >
                                <span className="block truncate">
                                  {item.name}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </PopoverContent>
            </Popover>
          )}
        />
        {errors.city?.message ? (
          <FieldError>{errors.city.message}</FieldError>
        ) : null}
      </Field>
    </>
  );
}
