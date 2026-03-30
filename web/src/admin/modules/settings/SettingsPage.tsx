// admin/modules/settings/SettingsPage.tsx
import { useState, useEffect } from "react";
import { z } from "zod";
import toast from "react-hot-toast";
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { FormBuilder, type FieldConfig } from "../../components/FormBuilder";
import { Spinner } from "../../../components/ui/Spinner";
import { adminApi } from "../../services/adminApi";
import type { SystemSettings } from "../../types";

const settingsSchema = z.object({
  rateLimitPerMinute: z.number().min(1, "En az 1 olmalidir"),
  maxUploadSizeMb: z.number().min(1, "En az 1 MB olmalidir"),
  maintenanceMode: z.boolean(),
  allowRegistration: z.boolean(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

const defaultValues: SettingsForm = {
  rateLimitPerMinute: 60,
  maxUploadSizeMb: 50,
  maintenanceMode: false,
  allowRegistration: true,
};

const fields: FieldConfig[] = [
  {
    name: "rateLimitPerMinute",
    label: "Rate Limit (istek/dk)",
    type: "number",
    placeholder: "60",
  },
  {
    name: "maxUploadSizeMb",
    label: "Maks Yukleme Boyutu (MB)",
    type: "number",
    placeholder: "50",
  },
  {
    name: "maintenanceMode",
    label: "Bakim Modu",
    type: "switch",
  },
  {
    name: "allowRegistration",
    label: "Kayit Izni",
    type: "switch",
  },
];

export default function SettingsPage() {
  const [initialValues, setInitialValues] = useState<SettingsForm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    adminApi
      .get<SystemSettings>("/settings")
      .then((data) => {
        if (!cancelled) {
          setInitialValues({
            rateLimitPerMinute: data.rateLimitPerMinute,
            maxUploadSizeMb: data.maxUploadSizeMb,
            maintenanceMode: data.maintenanceMode,
            allowRegistration: data.allowRegistration,
          });
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInitialValues(defaultValues);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (values: SettingsForm) => {
    await adminApi.patch("/settings", values);
    toast.success("Ayarlar kaydedildi");
  };

  return (
    <PageContainer>
      <PageHeader title="Ayarlar" subtitle="Sistem ayarlarini yapilandirin" />
      <PageContent>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "3rem",
            }}
          >
            <Spinner size="lg" />
          </div>
        ) : (
          <FormBuilder
            schema={settingsSchema}
            defaultValues={initialValues ?? defaultValues}
            onSubmit={handleSubmit}
            fields={fields}
            submitLabel="Kaydet"
            layout="two-column"
          />
        )}
      </PageContent>
    </PageContainer>
  );
}
