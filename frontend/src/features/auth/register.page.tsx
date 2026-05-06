import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";

import { useRegisterMutation } from "./api/auth.api";
import { AuthLayout } from "./compose/auth-layout";
import { registerSchema, type RegisterFormValues } from "./model/schemas";
import { selectIsAuthenticated } from "./model/selectors";

import { getApiErrorMessage } from "@/shared/lib/api-error";
import { useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import { Button } from "@/shared/ui/kit/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/kit/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/kit/field";
import { Input } from "@/shared/ui/kit/input";

const inputClass = "h-11 text-base";
const buttonClass = "w-full h-11 text-base font-medium";

function RegisterPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = form;

  useEffect(() => {
    if (isAuthenticated) {
      navigate(ROUTES.POSTS, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (values: RegisterFormValues) => {
    setGlobalError(null);

    try {
      await registerUser({
        email: values.email,
        username: values.username,
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

      if (lower.includes("имя пользователя") || lower.includes("username")) {
        form.setError("username", { type: "server", message });
      } else if (lower.includes("почт") || lower.includes("email")) {
        form.setError("email", { type: "server", message });
      } else {
        setGlobalError(message);
      }
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md p-1 sm:p-4">
        <CardHeader className="text-center">
          <CardTitle className="text-xl sm:text-2xl">Регистрация</CardTitle>
          <CardDescription>
            Создайте аккаунт, чтобы пользоваться платформой
          </CardDescription>
        </CardHeader>

        <CardContent>
          {globalError ? (
            <div
              role="alert"
              className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {globalError}
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit(onSubmit)}
            aria-busy={isLoading}
            noValidate
          >
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Почта</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={inputClass}
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

              <Field data-invalid={!!errors.username}>
                <FieldLabel htmlFor="username">Имя пользователя</FieldLabel>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="имя_пользователя"
                  className={inputClass}
                  disabled={isLoading}
                  aria-invalid={!!errors.username}
                  {...register("username")}
                />
                {errors.username?.message ? (
                  <FieldDescription role="alert" className="text-destructive">
                    {errors.username.message}
                  </FieldDescription>
                ) : null}
              </Field>

              <Field className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.password}>
                  <FieldLabel htmlFor="password">Пароль</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••"
                    className={inputClass}
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

                <Field data-invalid={!!errors.confirmPassword}>
                  <FieldLabel htmlFor="confirm-password">
                    Повторите пароль
                  </FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••"
                    className={inputClass}
                    disabled={isLoading}
                    aria-invalid={!!errors.confirmPassword}
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword?.message ? (
                    <FieldDescription role="alert" className="text-destructive">
                      {errors.confirmPassword.message}
                    </FieldDescription>
                  ) : null}
                </Field>
              </Field>

              <Field>
                <Button
                  type="submit"
                  size="lg"
                  className={buttonClass}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Создаём аккаунт...
                    </>
                  ) : (
                    "Зарегистрироваться"
                  )}
                </Button>

                <FieldDescription className="text-center">
                  Уже есть аккаунт? <Link to={ROUTES.LOGIN}>Войти</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

export const Component = RegisterPage;
