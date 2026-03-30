// admin/modules/content-moderation/ContentModerationPage.tsx
import { Shield } from "lucide-react";
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";

export default function ContentModerationPage() {
  return (
    <PageContainer>
      <PageHeader title="Icerik Moderasyonu" subtitle="Kullanici iceriklerini denetleyin" />
      <PageContent>
        <EmptyState
          icon={Shield}
          message="Moderasyon bekleyen icerik yok"
          description="Kullanicilar icerik paylastiginda burada goruntulecektir."
        />
      </PageContent>
    </PageContainer>
  );
}
