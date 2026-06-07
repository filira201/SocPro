import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useController, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";

import { useRegisterMutation } from "../api/auth.api";
import {
  USER_EMAIL_MAX,
  USER_FIO_PART_MAX,
  USER_PASSWORD_MAX,
} from "../model/auth-field-limits";
import { registerSchema, type RegisterFormValues } from "../model/schemas";

import { getApiErrorMessage } from "@/shared/lib/api-error";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import { Checkbox } from "@/shared/ui/kit/checkbox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/kit/field";
import { Input } from "@/shared/ui/kit/input";
import { Spinner } from "@/shared/ui/kit/spinner";

export function RegisterForm() {
  const navigate = useNavigate();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      patronymic: "",
      password: "",
      confirmPassword: "",
      personalDataConsent: false,
    },
    mode: "onSubmit",
  });
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = form;

  const { field: personalDataConsentField } = useController({
    control,
    name: "personalDataConsent",
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setGlobalError(null);

    try {
      await registerUser({
        email: values.email,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim() || undefined,
        patronymic: values.patronymic.trim() || undefined,
        password: values.password,
        personalDataConsent: values.personalDataConsent,
      }).unwrap();

      navigate(ROUTES.LOGIN, {
        replace: true,
        state: { justRegistered: true, email: values.email },
      });
    } catch (err) {
      const message = getApiErrorMessage(
        err as Parameters<typeof getApiErrorMessage>[0]
      );
      const lower = message.toLowerCase();

      if (message.includes("Имя:")) {
        form.setError("firstName", { type: "server", message });
      } else if (message.includes("Фамилия:")) {
        form.setError("lastName", { type: "server", message });
      } else if (message.includes("Отчество:")) {
        form.setError("patronymic", { type: "server", message });
      } else if (lower.includes("почт") || lower.includes("email")) {
        form.setError("email", { type: "server", message });
      } else if (
        message.includes("согласие на обработку персональных данных")
      ) {
        form.setError("personalDataConsent", { type: "server", message });
      } else {
        setGlobalError(message);
      }
    }
  };

  return (
    <>
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
              data-testid="register-email"
              maxLength={USER_EMAIL_MAX}
              {...register("email")}
            />
            {errors.email?.message ? (
              <FieldError data-testid="register-email-error">
                {errors.email.message}
              </FieldError>
            ) : null}
          </Field>

          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="firstName">
              Имя <span className="text-destructive">*</span>
            </FieldLabel>
            <Input
              id="firstName"
              autoComplete="given-name"
              placeholder="Иван"
              className="h-11 text-base"
              disabled={isLoading}
              aria-invalid={!!errors.firstName}
              data-testid="register-first-name"
              maxLength={USER_FIO_PART_MAX}
              {...register("firstName")}
            />
            {errors.firstName?.message ? (
              <FieldError data-testid="register-first-name-error">
                {errors.firstName.message}
              </FieldError>
            ) : null}
          </Field>

          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="lastName">Фамилия</FieldLabel>
            <Input
              id="lastName"
              autoComplete="family-name"
              placeholder="Иванов"
              className="h-11 text-base"
              disabled={isLoading}
              aria-invalid={!!errors.lastName}
              maxLength={USER_FIO_PART_MAX}
              {...register("lastName")}
            />
            {errors.lastName?.message ? (
              <FieldError>{errors.lastName.message}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={!!errors.patronymic}>
            <FieldLabel htmlFor="patronymic">Отчество</FieldLabel>
            <Input
              id="patronymic"
              autoComplete="additional-name"
              placeholder="Иванович"
              className="h-11 text-base"
              disabled={isLoading}
              aria-invalid={!!errors.patronymic}
              maxLength={USER_FIO_PART_MAX}
              {...register("patronymic")}
            />
            {errors.patronymic?.message ? (
              <FieldError>{errors.patronymic.message}</FieldError>
            ) : null}
          </Field>

          <Field className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.password}>
              <FieldLabel htmlFor="password">
                Пароль <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••"
                className="h-11 text-base"
                disabled={isLoading}
                aria-invalid={!!errors.password}
                data-testid="register-password"
                maxLength={USER_PASSWORD_MAX}
                {...register("password")}
              />
              {errors.password?.message ? (
                <FieldError data-testid="register-password-error">
                  {errors.password.message}
                </FieldError>
              ) : null}
            </Field>

            <Field data-invalid={!!errors.confirmPassword}>
              <FieldLabel htmlFor="confirm-password">
                Повторите пароль <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••"
                className="h-11 text-base"
                disabled={isLoading}
                aria-invalid={!!errors.confirmPassword}
                data-testid="register-confirm-password"
                maxLength={USER_PASSWORD_MAX}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword?.message ? (
                <FieldError data-testid="register-confirm-password-error">
                  {errors.confirmPassword.message}
                </FieldError>
              ) : null}
            </Field>
          </Field>

          <Field
            orientation="horizontal"
            data-invalid={!!errors.personalDataConsent}
          >
            <Checkbox
              id="personal-data-consent"
              checked={personalDataConsentField.value}
              onCheckedChange={(checked) =>
                personalDataConsentField.onChange(checked === true)
              }
              disabled={isLoading}
              aria-invalid={!!errors.personalDataConsent}
              data-testid="register-personal-data-consent"
            />
            <FieldContent className="min-w-0 flex-1 gap-1">
              <FieldLabel
                htmlFor="personal-data-consent"
                className="block w-full max-w-none cursor-pointer text-sm font-normal leading-relaxed [&_a]:underline [&_a]:underline-offset-4"
              >
                Я согласен с{" "}
                <Link
                  to={ROUTES.LEGAL}
                  data-testid="register-legal-terms-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  Пользовательским соглашением
                </Link>{" "}
                и даю{" "}
                <Link
                  to={ROUTES.LEGAL}
                  data-testid="register-legal-consent-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  согласие на обработку персональных данных
                </Link>
                .
              </FieldLabel>
              {errors.personalDataConsent?.message ? (
                <FieldError data-testid="register-personal-data-consent-error">
                  {errors.personalDataConsent.message}
                </FieldError>
              ) : null}
            </FieldContent>
          </Field>

          <Field>
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full text-base font-medium"
              disabled={isLoading}
              data-testid="register-submit"
            >
              {isLoading ? (
                <>
                  Создаём аккаунт...
                  <Spinner data-icon="inline-end" />
                </>
              ) : (
                "Зарегистрироваться"
              )}
            </Button>

            {globalError ? (
              <FieldError className="text-center">{globalError}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
      </form>
    </>
  );
}
