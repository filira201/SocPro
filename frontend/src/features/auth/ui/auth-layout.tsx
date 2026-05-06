import type { ReactNode } from "react";
import { Navigate } from "react-router";

import { selectIsAuthenticated } from "../model/selectors";

import { AuthHeader } from "./auth-header";

import { useAppSelector } from "@/shared/lib/redux";
import { ROUTES } from "@/shared/model/routes";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/kit/card";

type AuthLayoutProps = {
  title: ReactNode;
  description: ReactNode;
  form: ReactNode;
  footerText: ReactNode;
};

export function AuthLayout({
  title,
  description,
  form,
  footerText,
}: AuthLayoutProps) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <AuthHeader />
      <main className="flex flex-1 items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{form}</CardContent>
          <CardFooter>
            <p className="w-full text-center text-sm text-muted-foreground [&_a]:underline [&_a]:underline-offset-4">
              {footerText}
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
