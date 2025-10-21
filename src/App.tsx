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
import Simuladores from "./pages/Simuladores";

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
            <Route path="/simuladores" element={<Simuladores />} />
            <Route 
              path="/inventario/agente"
              element={
                <ProtectedRoute>
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
