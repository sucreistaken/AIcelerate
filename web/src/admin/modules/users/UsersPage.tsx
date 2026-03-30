// admin/modules/users/UsersPage.tsx
import { useState } from "react";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { DataTable, type Column } from "../../components/DataTable";
import { PermissionGate } from "../../components/PermissionGate";
import { Button } from "../../../components/ui/Button";
import { useTableState } from "../../hooks/useTableState";
import { useTableData } from "../../hooks/useTableData";
import { RoleBadge } from "./components/RoleBadge";
import { userAdminApi, type AdminUser } from "./services/userAdminApi";

export default function UsersPage() {
  const tableState = useTableState();
  const { data, total, isLoading, refetch } = useTableData<AdminUser>(
    "/users",
    tableState.params
  );
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (value: string) => {
    setSearchInput(value);
    tableState.setSearch(value);
  };

  const handleRoleChange = async (user: AdminUser, newRole: string) => {
    const userId = user._id || user.id;
    if (!userId) return;
    try {
      await userAdminApi.setRole(userId, newRole);
      toast.success("Rol guncellendi");
      refetch();
    } catch {
      // Error toast handled by adminApi
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const userId = user._id || user.id;
    if (!userId) return;
    if (!confirm(`"${user.email}" kullanicisini silmek istediginize emin misiniz?`)) return;
    try {
      await userAdminApi.delete(userId);
      toast.success("Kullanici silindi");
      refetch();
    } catch {
      // Error toast handled by adminApi
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: "email",
      label: "E-posta",
      sortable: true,
    },
    {
      key: "profile.nickname",
      label: "Kullanici Adi",
    },
    {
      key: "role",
      label: "Rol",
      render: (user) => {
        const role = user.role ?? user.adminRole ?? "viewer";
        return <RoleBadge role={role} />;
      },
    },
    {
      key: "status",
      label: "Durum",
      render: (user) => {
        const status = user.status ?? "offline";
        const color = status === "online" ? "#22c55e" : "#64748b";
        return (
          <span style={{ color, fontWeight: 500, textTransform: "capitalize" }}>
            {status}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Kayit Tarihi",
      sortable: true,
      render: (user) =>
        new Date(user.createdAt).toLocaleDateString("tr-TR"),
    },
    {
      key: "actions",
      label: "Islemler",
      render: (user) => (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <PermissionGate permission="roles:write">
            <select
              value={user.role ?? user.adminRole ?? "viewer"}
              onChange={(e) => handleRoleChange(user, e.target.value)}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.375rem",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#e2e8f0",
                fontSize: "0.8rem",
              }}
            >
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
              <option value="viewer">Viewer</option>
            </select>
          </PermissionGate>
          <PermissionGate permission="users:delete">
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(user)}
              aria-label="Sil"
            >
              <Trash2 size={14} />
            </Button>
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Kullanicilar"
        subtitle="Tum kullanicilari yonetin"
        actions={
          <input
            type="text"
            placeholder="Ara..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#e2e8f0",
              fontSize: "0.875rem",
              width: "240px",
            }}
          />
        }
      />
      <PageContent>
        <DataTable
          data={data}
          columns={columns}
          loading={isLoading}
          pagination={{
            page: tableState.page,
            pageSize: tableState.limit,
            total,
            onPageChange: tableState.setPage,
          }}
          sorting={{
            sortBy: tableState.sortBy,
            sortDir: tableState.sortDir,
            onSort: tableState.setSort,
          }}
          keyExtractor={(u) => u._id || u.id || u.email}
        />
      </PageContent>
    </PageContainer>
  );
}
