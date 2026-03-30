// admin/AdminApp.tsx — Admin panel entry point
// BrowserRouter is already provided by main.tsx — do NOT add another one
import { AdminRoutes } from "./routes";

export default function AdminApp() {
  return <AdminRoutes />;
}
