import type { ActiveTab } from "../../hooks/useCourseDashboard";
import { Tabs, TabsList, TabsTrigger } from "../ui/Tabs";
import { t } from "../../utils/i18n";

const TABS: Array<{ id: ActiveTab; label: string }> = [
  { id: "overview", label: "course.overviewTab" },
  { id: "progress", label: "course.progressTab" },
  { id: "schedule", label: "course.scheduleTab" },
];

interface CourseTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export function CourseTabs({ activeTab, onTabChange }: CourseTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as ActiveTab)}>
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {t(tab.label)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
