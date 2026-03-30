// admin/modules/notifications/NotificationsPage.tsx
import { z } from "zod";
import toast from "react-hot-toast";
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { FormBuilder, type FieldConfig } from "../../components/FormBuilder";
import { adminApi } from "../../services/adminApi";

const notificationSchema = z.object({
  title: z.string().min(1, "Baslik zorunludur"),
  message: z.string().min(1, "Mesaj zorunludur"),
  type: z.string().min(1, "Tur seciniz"),
});

type NotificationForm = z.infer<typeof notificationSchema>;

const defaultValues: NotificationForm = {
  title: "",
  message: "",
  type: "info",
};

const fields: FieldConfig[] = [
  {
    name: "title",
    label: "Baslik",
    type: "text",
    required: true,
    placeholder: "Bildirim basligi",
  },
  {
    name: "message",
    label: "Mesaj",
    type: "textarea",
    required: true,
    rows: 4,
    placeholder: "Bildirim mesaji",
  },
  {
    name: "type",
    label: "Tur",
    type: "select",
    options: [
      { label: "Bilgi", value: "info" },
      { label: "Uyari", value: "warning" },
      { label: "Basari", value: "success" },
    ],
  },
];

export default function NotificationsPage() {
  const handleSubmit = async (values: NotificationForm) => {
    await adminApi.post("/notifications", values);
    toast.success("Bildirim gonderildi");
  };

  return (
    <PageContainer>
      <PageHeader
        title="Bildirimler"
        subtitle="Kullanicilara bildirim gonderin"
      />
      <PageContent>
        <FormBuilder
          schema={notificationSchema}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          fields={fields}
          submitLabel="Gonder"
        />
      </PageContent>
    </PageContainer>
  );
}
