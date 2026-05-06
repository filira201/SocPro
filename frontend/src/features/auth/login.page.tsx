import { Link, useLocation } from "react-router";

import { AuthLayout } from "./ui/auth-layout";
import { LoginForm } from "./ui/login-form";

import { ROUTES } from "@/shared/model/routes";

type LocationState = {
  justRegistered?: boolean;
  email?: string;
} | null;

function LoginPage() {
  const location = useLocation();
  const state = location.state as LocationState;

  return (
    <AuthLayout
      title="Вход"
      description="Введите почту и пароль для входа в аккаунт"
      form={
        <LoginForm
          defaultEmail={state?.email ?? ""}
          showRegisteredBanner={Boolean(state?.justRegistered)}
        />
      }
      footerText={
        <>
          Нет аккаунта? <Link to={ROUTES.REGISTER}>Зарегистрироваться</Link>
        </>
      }
    />
  );
}

export const Component = LoginPage;
