import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";

import { useLoginMutation } from "../api/auth.api";
import { USER_EMAIL_MAX, USER_PASSWORD_MAX } from "../model/auth-field-limits";
import { loginSchema, type LoginFormValues } from "../model/schemas";

import { getApiErrorMessage } from "@/shared/lib/api-error";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/kit/field";
import { Input } from "@/shared/ui/kit/input";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
} from "@/shared/ui/kit/item";
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
        <Item
          role="status"
          variant="outline"
          className="mb-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        >
          <ItemMedia variant="icon">
            <CircleCheck className="text-emerald-600 dark:text-emerald-400" />
          </ItemMedia>
          <ItemContent>
            <ItemDescription className="line-clamp-none text-emerald-700 dark:text-emerald-400">
              Регистрация прошла успешно. Войдите, используя свои данные.
            </ItemDescription>
          </ItemContent>
        </Item>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} aria-busy={isLoading} noValidate>
        <FieldGroup>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">
              Почта <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="h-11 text-base"
              disabled={isLoading}
              aria-invalid={!!errors.email}
              data-testid="login-email"
              maxLength={USER_EMAIL_MAX}
              {...register("email")}
            />
            {errors.email?.message ? (
              <FieldError data-testid="login-email-error">
                {errors.email.message}
              </FieldError>
            ) : null}
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">
              Пароль <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••"
              className="h-11 text-base"
              disabled={isLoading}
              aria-invalid={!!errors.password}
              data-testid="login-password"
              maxLength={USER_PASSWORD_MAX}
              {...register("password")}
            />
            {errors.password?.message ? (
              <FieldError data-testid="login-password-error">
                {errors.password.message}
              </FieldError>
            ) : null}
          </Field>

          <Field>
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full text-base font-medium"
              disabled={isLoading}
              data-testid="login-submit"
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
              <FieldError
                className="text-center"
                data-testid="login-global-error"
              >
                {globalError}
              </FieldError>
            ) : null}
          </Field>
        </FieldGroup>
      </form>
    </>
  );
}
