// admin/modules/courses/CoursesPage.tsx
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

interface AdminCourse {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  lessonIds: string[];
  createdAt: string;
}

export default function CoursesPage() {
  const tableState = useTableState();
  const { data, total, isLoading, refetch } = useTableData<AdminCourse>(
    "/courses",
    tableState.params
  );
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (value: string) => {
    setSearchInput(value);
    tableState.setSearch(value);
  };

  const handleDelete = async (course: AdminCourse) => {
    const courseId = course._id || course.id;
    if (!courseId) return;
    if (!confirm(`"${course.name}" kursunu silmek istediginize emin misiniz?`)) return;
    try {
      await adminApi.del(`/courses/${courseId}`);
      toast.success("Kurs silindi");
      refetch();
    } catch {
      // Error toast handled by adminApi
    }
  };

  const columns: Column<AdminCourse>[] = [
    {
      key: "code",
      label: "Kod",
      sortable: true,
    },
    {
      key: "name",
      label: "Kurs Adi",
      sortable: true,
    },
    {
      key: "lessonIds",
      label: "Ders Sayisi",
      render: (course) => course.lessonIds?.length ?? 0,
    },
    {
      key: "createdAt",
      label: "Olusturma Tarihi",
      sortable: true,
      render: (course) =>
        new Date(course.createdAt).toLocaleDateString("tr-TR"),
    },
    {
      key: "actions",
      label: "Islemler",
      render: (course) => (
        <PermissionGate permission="courses:delete">
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(course)}
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
        title="Kurslar"
        subtitle="Tum kurslari yonetin"
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
          keyExtractor={(c) => c._id || c.id || c.code}
        />
      </PageContent>
    </PageContainer>
  );
}
