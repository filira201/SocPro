import { AuthHeader } from "@/features/auth/ui/auth-header";

function LegalPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthHeader />
      <main className="flex flex-1 items-center justify-center px-3 py-6 sm:px-4">
        <p
          data-testid="legal-placeholder"
          className="text-center text-muted-foreground"
        >
          Страница в разработке
        </p>
      </main>
    </div>
  );
}

export const Component = LegalPage;
