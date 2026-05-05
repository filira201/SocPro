import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";

import { useLoginMutation } from "./api/auth.api";
import { AuthHeader } from "./compose/auth-header";
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
    <div className="min-h-screen flex flex-col">
      <AuthHeader />

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md p-2 sm:p-4">
          <CardHeader>
            <CardTitle className="text-2xl">Вход</CardTitle>
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Пароль</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
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
                      Вход...
                    </>
                  ) : (
                    "Войти"
                  )}
                </Button>

                {globalError ? (
                  <p
                    role="alert"
                    className="text-center text-sm text-destructive"
                  >
                    {globalError}
                  </p>
                ) : null}
              </form>
            </Form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Нет аккаунта?{" "}
              <Link
                to={ROUTES.REGISTER}
                className="text-primary underline-offset-4 hover:underline"
              >
                Зарегистрироваться
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Component = LoginPage;
