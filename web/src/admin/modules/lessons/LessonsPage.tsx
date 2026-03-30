// admin/modules/lessons/LessonsPage.tsx
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
import { adminApi } from "../../services/adminApi";

interface AdminLesson {
  _id?: string;
  id?: string;
  title: string;
  courseCode?: string;
  plan?: {
    modules?: unknown[];
  };
  createdAt: string;
}

export default function LessonsPage() {
  const tableState = useTableState();
  const { data, total, isLoading, refetch } = useTableData<AdminLesson>(
    "/lessons",
    tableState.params
  );
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (value: string) => {
    setSearchInput(value);
    tableState.setSearch(value);
  };

  const handleDelete = async (lesson: AdminLesson) => {
    const lessonId = lesson._id || lesson.id;
    if (!lessonId) return;
    if (!confirm(`"${lesson.title}" dersini silmek istediginize emin misiniz?`)) return;
    try {
      await adminApi.del(`/lessons/${lessonId}`);
      toast.success("Ders silindi");
      refetch();
    } catch {
      // Error toast handled by adminApi
    }
  };

  const columns: Column<AdminLesson>[] = [
    {
      key: "title",
      label: "Baslik",
      sortable: true,
    },
    {
      key: "courseCode",
      label: "Kurs Kodu",
    },
    {
      key: "plan.modules",
      label: "Modul",
      render: (lesson) => lesson.plan?.modules?.length ?? 0,
    },
    {
      key: "createdAt",
      label: "Olusturma Tarihi",
      sortable: true,
      render: (lesson) =>
        new Date(lesson.createdAt).toLocaleDateString("tr-TR"),
    },
    {
      key: "actions",
      label: "Islemler",
      render: (lesson) => (
        <PermissionGate permission="lessons:delete">
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(lesson)}
            aria-label="Sil"
          >
            <Trash2 size={14} />
          </Button>
        </PermissionGate>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Dersler"
        subtitle="Tum dersleri yonetin"
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
          keyExtractor={(l) => l._id || l.id || l.title}
        />
      </PageContent>
    </PageContainer>
  );
}
