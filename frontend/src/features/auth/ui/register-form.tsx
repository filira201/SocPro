import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";

import { useRegisterMutation } from "../api/auth.api";
import { registerSchema, type RegisterFormValues } from "../model/schemas";

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
    },
    mode: "onSubmit",
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = form;

  const onSubmit = async (values: RegisterFormValues) => {
    setGlobalError(null);

    try {
      await registerUser({
        email: values.email,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim() || undefined,
        patronymic: values.patronymic.trim() || undefined,
        password: values.password,
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
              {...register("email")}
            />
            {errors.email?.message ? (
              <FieldError>{errors.email.message}</FieldError>
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
              {...register("firstName")}
            />
            {errors.firstName?.message ? (
              <FieldError>{errors.firstName.message}</FieldError>
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
                {...register("password")}
              />
              {errors.password?.message ? (
                <FieldError>{errors.password.message}</FieldError>
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
                {...register("confirmPassword")}
              />
              {errors.confirmPassword?.message ? (
                <FieldError>{errors.confirmPassword.message}</FieldError>
              ) : null}
            </Field>
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
