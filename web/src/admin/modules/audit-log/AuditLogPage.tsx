// admin/modules/audit-log/AuditLogPage.tsx
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { DataTable, type Column } from "../../components/DataTable";
import { useTableState } from "../../hooks/useTableState";
import { useTableData } from "../../hooks/useTableData";
import type { AuditEntry } from "../../types";

export default function AuditLogPage() {
  const tableState = useTableState({ defaultLimit: 30 });
  const { data, total, isLoading } = useTableData<AuditEntry>(
    "/audit-log",
    tableState.params
  );

  const columns: Column<AuditEntry>[] = [
    {
      key: "action",
      label: "Islem",
      sortable: true,
    },
    {
      key: "resource",
      label: "Kaynak",
    },
    {
      key: "userId",
      label: "Kullanici ID",
      render: (entry) => {
        const uid = entry.userId || "";
        return uid.length > 12 ? `${uid.slice(0, 12)}...` : uid;
      },
    },
    {
      key: "ip",
      label: "IP",
    },
    {
      key: "timestamp",
      label: "Tarih",
      sortable: true,
      render: (entry) =>
        new Date(entry.timestamp).toLocaleString("tr-TR"),
    },
  ];

  return (
    <PageContainer>
      <PageHeader title="Audit Log" subtitle="Sistem islem kayitlari" />
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
          keyExtractor={(e) => e.id}
        />
      </PageContent>
    </PageContainer>
  );
}
