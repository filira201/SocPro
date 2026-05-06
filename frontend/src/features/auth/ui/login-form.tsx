import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";

import { useLoginMutation } from "../api/auth.api";
import { loginSchema, type LoginFormValues } from "../model/schemas";

import { getApiErrorMessage } from "@/shared/lib/api-error";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/kit/field";
import { Input } from "@/shared/ui/kit/input";
import { Spinner } from "@/shared/ui/kit/spinner";

type LoginFormProps = {
  defaultEmail?: string;
  showRegisteredBanner?: boolean;
};

export function LoginForm({
  defaultEmail = "",
  showRegisteredBanner = false,
}: LoginFormProps) {
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: defaultEmail,
      password: "",
    },
    mode: "onSubmit",
  });

  const onSubmit = async (values: LoginFormValues) => {
    setGlobalError(null);

    try {
      await login(values).unwrap();
      navigate(ROUTES.POSTS, { replace: true });
    } catch (err) {
      const message = getApiErrorMessage(
        err as Parameters<typeof getApiErrorMessage>[0]
      );
      setGlobalError(message);
    }
  };

  return (
    <>
      {showRegisteredBanner ? (
        <div
          role="status"
          className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
        >
          Регистрация прошла успешно. Войдите, используя свои данные.
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} aria-busy={isLoading} noValidate>
        <FieldGroup>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Почта</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11 text-base"
              disabled={isLoading}
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email?.message ? (
              <FieldDescription role="alert" className="text-destructive">
                {errors.email.message}
              </FieldDescription>
            ) : null}
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Пароль</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
              className="h-11 text-base"
              disabled={isLoading}
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password?.message ? (
              <FieldDescription role="alert" className="text-destructive">
                {errors.password.message}
              </FieldDescription>
            ) : null}
          </Field>

          <Field>
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  Вход...
                  <Spinner data-icon="inline-end" />
                </>
              ) : (
                "Войти"
              )}
            </Button>

            {globalError ? (
              <FieldDescription
                role="alert"
                className="text-center text-destructive"
              >
                {globalError}
              </FieldDescription>
            ) : null}
          </Field>
        </FieldGroup>
      </form>
    </>
  );
}
