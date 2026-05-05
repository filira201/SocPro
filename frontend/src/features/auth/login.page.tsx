import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";

import { useLoginMutation } from "./api/auth.api";
import { AuthLayout } from "./compose/auth-layout";
import { loginSchema, type LoginFormValues } from "./model/schemas";
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

type LocationState = {
  justRegistered?: boolean;
  email?: string;
} | null;

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [login, { isLoading }] = useLoginMutation();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: state?.email ?? "",
      password: "",
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
    <AuthLayout>
      <Card className="w-full max-w-md p-1 sm:p-4">
        <CardHeader className="text-center">
          <CardTitle className="text-xl sm:text-2xl">Вход</CardTitle>
          <CardDescription>
            Введите почту и пароль для входа в аккаунт
          </CardDescription>
        </CardHeader>

        <CardContent>
          {state?.justRegistered ? (
            <div
              role="status"
              className="mb-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
            >
              Регистрация прошла успешно. Войдите, используя свои данные.
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
                  <FieldDescription
                    role="alert"
                    className="text-destructive"
                  >
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
                  className={inputClass}
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                {errors.password?.message ? (
                  <FieldDescription
                    role="alert"
                    className="text-destructive"
                  >
                    {errors.password.message}
                  </FieldDescription>
                ) : null}
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
                      Вход...
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

                <FieldDescription className="text-center">
                  Нет аккаунта?{" "}
                  <Link to={ROUTES.REGISTER}>Зарегистрироваться</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

export const Component = LoginPage;
