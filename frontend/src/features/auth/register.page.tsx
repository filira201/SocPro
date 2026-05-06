import { Link } from "react-router";

import { AuthLayout } from "./ui/auth-layout";
import { RegisterForm } from "./ui/register-form";

import { ROUTES } from "@/shared/model/routes";

function RegisterPage() {
  return (
    <AuthLayout
      title="Регистрация"
      description="Создайте аккаунт, чтобы пользоваться платформой"
      form={<RegisterForm />}
      footerText={
        <>
          Уже есть аккаунт? <Link to={ROUTES.LOGIN}>Войти</Link>
        </>
      }
    />
  );
}

export const Component = RegisterPage;
