// admin/modules/ai-stats/AiStatsPage.tsx
import { BarChart3 } from "lucide-react";
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";

export default function AiStatsPage() {
  return (
    <PageContainer>
      <PageHeader title="AI Istatistikleri" subtitle="AI API kullanim verileri" />
      <PageContent>
        <EmptyState
          icon={BarChart3}
          message="AI istatistikleri yakinda"
          description="AI API kullanim verileri burada goruntulecektir."
        />
      </PageContent>
    </PageContainer>
  );
}
