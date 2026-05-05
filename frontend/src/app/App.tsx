import { Outlet } from "react-router";

export function App() {
  return (
    <main className="min-h-dvh flex flex-col">
      <Outlet />
    </main>
  );
}
