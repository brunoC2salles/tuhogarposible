import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, ArrowLeft, TrendingUp, Users, Target, Award } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { ConversionFunnelChart } from '@/components/dashboard/ConversionFunnelChart';
import { AgentPerformanceChart } from '@/components/dashboard/AgentPerformanceChart';
import { LeadsByStageChart } from '@/components/dashboard/LeadsByStageChart';
import { TimelineChart } from '@/components/dashboard/TimelineChart';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const { stats, loading, error, refetch } = useDashboardStats(period);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/inventario/agente/crm');
    }
  }, [isAdmin, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background">
        <div className="container mx-auto p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Error al cargar estadísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/inventario/admin/crm')}
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate">Dashboard Analítico</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  Métricas y estadísticas de rendimiento
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <NotificationBell />
              <div className="text-right">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Period Selector */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 sm:grid-cols-4 gap-1">
            <TabsTrigger value="7d" className="text-xs sm:text-sm">7 días</TabsTrigger>
            <TabsTrigger value="30d" className="text-xs sm:text-sm">30 días</TabsTrigger>
            <TabsTrigger value="90d" className="text-xs sm:text-sm">90 días</TabsTrigger>
            <TabsTrigger value="all" className="text-xs sm:text-sm">Todo</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.newLeadsThisPeriod || 0} nuevos en el período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.conversionRate?.toFixed(1) || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {stats?.convertedLeads || 0} leads convertidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agentes Activos</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeAgents || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total de agentes en el sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads por Agente</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.avgLeadsPerAgent?.toFixed(1) || 0}</div>
              <p className="text-xs text-muted-foreground">
                Promedio de leads por agente
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="funnel" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="funnel">Embudo</TabsTrigger>
            <TabsTrigger value="agents">Agentes</TabsTrigger>
            <TabsTrigger value="stages">Etapas</TabsTrigger>
            <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
          </TabsList>

          <TabsContent value="funnel" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Embudo de Conversión</CardTitle>
                <CardDescription>
                  Visualiza el progreso de leads a través de cada etapa del funnel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConversionFunnelChart data={stats?.funnelData || []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rendimiento por Agente</CardTitle>
                <CardDescription>
                  Comparación de leads asignados, convertidos y tasa de conversión
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentPerformanceChart data={stats?.agentPerformance || []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Etapa</CardTitle>
                <CardDescription>
                  Cantidad de leads en cada etapa del proceso de ventas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeadsByStageChart data={stats?.stageDistribution || []} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Línea de Tiempo</CardTitle>
                <CardDescription>
                  Evolución de leads creados y convertidos en el tiempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimelineChart data={stats?.timelineData || []} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
