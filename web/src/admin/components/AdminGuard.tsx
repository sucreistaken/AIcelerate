// admin/components/AdminGuard.tsx — Auth + permission guard for admin panel
import type { ReactNode } from "react";
import { useAuthStore } from "../../stores/authStore";
import { Button } from "../../components/ui/Button";

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, user } = useAuthStore();

  // DEV BYPASS — skip auth in development
  const isDev = import.meta.env.DEV;
  if (isDev) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "1rem",
          background: "#0f172a",
          color: "#e2e8f0",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
          Giris Gerekli
        </h1>
        <p style={{ color: "#94a3b8" }}>
          Admin paneline erisim icin giris yapmaniz gerekmektedir.
        </p>
        <Button onClick={() => (window.location.href = "/")}>
          Uygulamaya Don
        </Button>
      </div>
    );
  }

  const userAny = user as unknown as Record<string, unknown>;
  const role = userAny?.role ?? userAny?.adminRole;

  if (!role) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "1rem",
          background: "#0f172a",
          color: "#e2e8f0",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
          Yetkisiz Erisim
        </h1>
        <p style={{ color: "#94a3b8" }}>
          Bu sayfaya erisim yetkiniz bulunmamaktadir.
        </p>
        <Button onClick={() => (window.location.href = "/")}>
          Uygulamaya Don
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
