import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";

import { useRegisterMutation } from "./api/auth.api";
import { AuthHeader } from "./compose/auth-header";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/kit/form";
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
    <div className="min-h-dvh flex flex-col">
      <AuthHeader />

      <div className="flex flex-1 items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
        <Card className="w-full max-w-md p-1 sm:p-4">
          <CardHeader>
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

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                aria-busy={isLoading}
                className="grid gap-5"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Почта</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          className={inputClass}
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имя пользователя</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="username"
                          placeholder="имя_пользователя"
                          className={inputClass}
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Пароль</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••"
                          className={inputClass}
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Повторите пароль</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="••••••"
                          className={inputClass}
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </form>
            </Form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{" "}
              <Link
                to={ROUTES.LOGIN}
                className="text-primary underline-offset-4 hover:underline"
              >
                Войти
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Component = RegisterPage;
