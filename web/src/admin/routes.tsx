// admin/routes.tsx — Admin panel route configuration
import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Spinner } from "../components/ui/Spinner";
import { AdminLayout } from "./components/AdminLayout";
import { AdminGuard } from "./components/AdminGuard";
import { AdminNotFound } from "./components/AdminNotFound";

const DashboardPage = lazy(() => import("./modules/dashboard"));
const UsersPage = lazy(() => import("./modules/users"));
const CoursesPage = lazy(() => import("./modules/courses"));
const LessonsPage = lazy(() => import("./modules/lessons"));
const ContentModerationPage = lazy(
  () => import("./modules/content-moderation")
);
const NotificationsPage = lazy(() => import("./modules/notifications"));
const AiStatsPage = lazy(() => import("./modules/ai-stats"));
const AuditLogPage = lazy(() => import("./modules/audit-log"));
const SettingsPage = lazy(() => import("./modules/settings"));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "40vh",
          }}
        >
          <Spinner size="lg" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function AdminRoutes() {
  return (
    <AdminGuard>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route
            index
            element={
              <SuspenseWrapper>
                <DashboardPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="users"
            element={
              <SuspenseWrapper>
                <UsersPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="courses"
            element={
              <SuspenseWrapper>
                <CoursesPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="lessons"
            element={
              <SuspenseWrapper>
                <LessonsPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="content-moderation"
            element={
              <SuspenseWrapper>
                <ContentModerationPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="notifications"
            element={
              <SuspenseWrapper>
                <NotificationsPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="ai-stats"
            element={
              <SuspenseWrapper>
                <AiStatsPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="audit-log"
            element={
              <SuspenseWrapper>
                <AuditLogPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="settings"
            element={
              <SuspenseWrapper>
                <SettingsPage />
              </SuspenseWrapper>
            }
          />
          <Route path="*" element={<AdminNotFound />} />
        </Route>
      </Routes>
    </AdminGuard>
  );
}
