import { AuthHeader } from "./auth-header";

type AuthLayoutProps = {
  children: React.ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh flex flex-col">
      <AuthHeader />

      <div className="flex flex-1 items-center justify-center px-3 py-6 sm:px-4 sm:py-8">
        {children}
      </div>
    </div>
  );
}
