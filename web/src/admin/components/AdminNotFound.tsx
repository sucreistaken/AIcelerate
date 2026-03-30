// admin/components/AdminNotFound.tsx — 404 page for admin panel
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";

export function AdminNotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "1rem",
        color: "#e2e8f0",
      }}
    >
      <h1 style={{ fontSize: "3rem", fontWeight: 700, color: "#6366f1" }}>
        404
      </h1>
      <p style={{ fontSize: "1.25rem", fontWeight: 500 }}>
        Sayfa Bulunamadi
      </p>
      <p style={{ color: "#94a3b8" }}>
        Aradiginiz sayfa mevcut degil veya kaldirilmis olabilir.
      </p>
      <Button onClick={() => navigate("/admin")}>
        Dashboard'a Don
      </Button>
    </div>
  );
}
