import { Outlet } from "react-router";

export function App() {
  return (
    <main className="min-h-screen flex flex-col">
      <Outlet />
    </main>
  );
}
