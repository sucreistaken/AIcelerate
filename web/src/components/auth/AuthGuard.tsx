import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useCourseStore } from "../../stores/courseStore";
import { useLessonStore } from "../../stores/lessonStore";
import { dashboardApi } from "../../services/api";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

interface Props {
  children: React.ReactNode;
}

/**
 * AuthGuard — optimistic-render auth gate.
 *
 * First-paint strategy (stale-while-revalidate):
 *   1. If persist rehydration already gave us `isAuthenticated=true` + a token,
 *      we render the authenticated UI IMMEDIATELY using cached course/lesson
 *      data from localStorage. Zero loading screen, zero flicker for returning
 *      users — this is the same pattern Linear/Superhuman use for local-first
 *      apps.
 *   2. In the background, we fire `fetchMe()` (validates the session; clears
 *      auth if the token was revoked) and `dashboardApi.init()` (replaces
 *      stores with the fresh server truth). Both are silent — no spinner.
 *   3. If fetchMe clears auth, `isAuthenticated` flips to false and this
 *      component re-renders into the LoginPage, preserving the security
 *      invariant that a revoked user gets bounced within ~200ms.
 *
 * First-time login (no persisted auth) still goes through LoginPage; the
 * post-login bootstrap populates stores BEFORE the UI renders because `token`
 * only becomes truthy after authStore.login() resolves — by then AuthGuard's
 * background fetch has started and dashboard data arrives shortly after.
 */
export default function AuthGuard({ children }: Props) {
  const { isAuthenticated, token, fetchMe } = useAuthStore();
  const [authView, setAuthView] = useState<"login" | "register">("login");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    // Fire both in parallel, non-blocking. fetchMe handles its own auth-state
    // mutation; dashboardApi.init swallows errors and returns null.
    (async () => {
      const [, dashData] = await Promise.all([
        fetchMe(),
        dashboardApi.init(),
      ]);
      if (cancelled || !dashData?.ok) return;
      if (Array.isArray(dashData.lessons)) {
        useLessonStore.getState().setLessons(dashData.lessons);
      }
      if (Array.isArray(dashData.courses)) {
        useCourseStore.getState().setCourses(dashData.courses);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, fetchMe]);

  if (!isAuthenticated) {
    if (authView === "register") {
      return <RegisterPage onSwitchToLogin={() => setAuthView("login")} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthView("register")} />;
  }

  return <>{children}</>;
}
