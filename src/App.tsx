import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AgenteInventario from "./pages/inventario/AgenteInventario";
import AdminInventario from "./pages/inventario/AdminInventario";
import AgenteCRM from "./pages/inventario/AgenteCRM";
import AdminCRM from "./pages/inventario/AdminCRM";
import SimuladoresIndex from "./pages/simuladores/SimuladoresIndex";
import SimuladorPersonalPage from "./pages/simuladores/SimuladorPersonalPage";
import SimuladorHipotecarioPage from "./pages/simuladores/SimuladorHipotecarioPage";
import FormularioQualificacion from "./pages/FormularioQualificacion";
import AgentSettings from "./pages/AgentSettings";
import AdminAgentes from "./pages/AdminAgentes";
import AdminSettings from "./pages/AdminSettings";
import AgenteDetails from "./pages/AgenteDetails";
import ProdutoPublico from "./pages/ProdutoPublico";
import AcademiaAgentes from "./pages/academia/AcademiaAgentes";
import ControleFinanceiro from "./pages/financeiro/ControleFinanceiro";
import AdminContractTemplates from "./pages/AdminContractTemplates";
import ContratoPublico from "./pages/ContratoPublico";
import Dashboard from "./pages/admin/Dashboard";
import Reclutamiento from "./pages/admin/Reclutamiento";
import AbandonosFormulario from "./pages/admin/AbandonosFormulario";
import AdminDashboardCentral from "./pages/admin/AdminDashboardCentral";
import ChatPage from "./pages/chat/ChatPage";
import SupervisorCRM from "./pages/supervisor/SupervisorCRM";
import SupervisorFinanceiro from "./pages/supervisor/SupervisorFinanceiro";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/formulario-qualificacion" element={<FormularioQualificacion />} />
            <Route path="/simuladores" element={<SimuladoresIndex />} />
            <Route path="/simuladores/credito-personal" element={<SimuladorPersonalPage />} />
            <Route path="/simuladores/credito-hipotecario" element={<SimuladorHipotecarioPage />} />
            <Route 
              path="/inventario/agente"
              element={
                <ProtectedRoute allowedRoles={['agente']}>
                  <AgenteInventario />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventario/admin" 
              element={
                <ProtectedRoute requireAdmin>
                  <AdminInventario />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventario/agente/crm"
              element={
                <ProtectedRoute>
                  <AgenteCRM />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/inventario/admin/crm"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminCRM />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboardCentral />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard"
              element={
                <ProtectedRoute requireAdmin>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/agente/settings"
              element={
                <ProtectedRoute>
                  <AgentSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/agentes"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminAgentes />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/agentes/:agenteId"
              element={
                <ProtectedRoute requireAdmin>
                  <AgenteDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/reclutamiento"
              element={
                <ProtectedRoute requireAdmin>
                  <Reclutamiento />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/abandonos"
              element={
                <ProtectedRoute requireAdmin>
                  <AbandonosFormulario />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminSettings />
                </ProtectedRoute>
              } 
            />
            <Route path="/produto/:id" element={<ProdutoPublico />} />
            <Route 
              path="/academia"
              element={
                <ProtectedRoute>
                  <AcademiaAgentes />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/financiero"
              element={
                <ProtectedRoute requireAdmin>
                  <ControleFinanceiro />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/contract-templates"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminContractTemplates />
                </ProtectedRoute>
              } 
            />
            <Route path="/contrato/:token" element={<ContratoPublico />} />
            <Route 
              path="/supervisor/crm"
              element={
                <ProtectedRoute allowedRoles={['supervisor']}>
                  <SupervisorCRM />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/supervisor/financiero"
              element={
                <ProtectedRoute allowedRoles={['supervisor']}>
                  <SupervisorFinanceiro />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/chat"
              element={
                <ProtectedRoute allowedRoles={['admin', 'agente']}>
                  <ChatPage />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
