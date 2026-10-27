import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./app/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { StoreProvider } from "./data/store";
import { AdminPage } from "./pages/AdminPage";
import { ClientProfilePage } from "./pages/ClientProfilePage";
import { ClientsListPage } from "./pages/ClientsListPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LeadsPage } from "./pages/LeadsPage";
import { LoginPage } from "./pages/LoginPage";
import { PlanDocumentsPage } from "./pages/PlanDocumentsPage";
import { PlansPage } from "./pages/PlansPage";
import { ProductPlansPage } from "./pages/ProductPlansPage";
import { QuotationsPage } from "./pages/QuotationsPage";
import { RegisterPage } from "./pages/RegisterPage";
import { RemindersPage } from "./pages/RemindersPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Workspace Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/clients" element={<ClientsListPage />} />
              <Route path="/clients/:id" element={<ClientProfilePage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/plans/:productId" element={<ProductPlansPage />} />
              <Route path="/plans/:productId/:planId" element={<PlanDocumentsPage />} />
              <Route path="/quotations" element={<QuotationsPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
