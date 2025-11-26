import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/hooks/useLeads';
import { useAgentes } from '@/hooks/useAgentes';
import { ArrowLeft, Users, TrendingUp, CheckCircle, Building, LogOut, UserCog, Settings, FileText, BarChart3 } from 'lucide-react';
import { STAGE_LABELS } from '@/types/crm';
import { NotificationBell } from '@/components/notifications/NotificationBell';

const AdminCRM = () => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { leads } = useLeads();
  const { agentes } = useAgentes();

  const totalLeads = leads.length;
  const leadsThisMonth = leads.filter(l => {
    const created = new Date(l.created_at);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  const leadsConvertidos = leads.filter(l => l.stage === 'listo').length;
  const tasaConversion = totalLeads > 0 ? ((leadsConvertidos / totalLeads) * 100).toFixed(1) : '0';

  const leadsPorAgente = agentes.map(agente => ({
    ...agente,
    totalLeads: leads.filter(l => l.agente_asignado_id === agente.id).length,
    leadsActivos: leads.filter(l => l.agente_asignado_id === agente.id && l.stage !== 'listo').length,
  }));

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button variant="ghost" size="icon" onClick={() => navigate('/inventario/admin')}>
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">Dashboard CRM</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Admin: {profile?.nombre}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/dashboard')}>
                <BarChart3 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/contract-templates')}>
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Templates</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/settings')}>
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Config</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/agentes')}>
                <UserCog className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Agentes</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/inventario/admin')}>
                <Building className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Inventario</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads}</div>
              <p className="text-xs text-muted-foreground">{leadsThisMonth} este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadsConvertidos}</div>
              <p className="text-xs text-muted-foreground">Llegaron a "Listo!"</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasaConversion}%</div>
              <p className="text-xs text-muted-foreground">De todos los leads</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Leads por Agente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leadsPorAgente.map(agente => (
                <div key={agente.id} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <p className="font-medium">{agente.nombre}</p>
                    <p className="text-sm text-muted-foreground">{agente.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{agente.totalLeads} leads</p>
                    <p className="text-sm text-muted-foreground">{agente.leadsActivos} activos</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminCRM;
