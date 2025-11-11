import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, FileText, AlertCircle } from "lucide-react";

const ControleFinanceiro = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Control Financiero</h1>
            <p className="text-muted-foreground mt-2">
              {isAdmin 
                ? "Vista general de comisiones y gastos operacionales" 
                : "Mis comisiones y estado de pagos"}
            </p>
          </div>
          <Badge variant="outline" className="text-orange-500 border-orange-500">
            <AlertCircle className="h-3 w-3 mr-1" />
            En Desarrollo
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="commissions">Comisiones</TabsTrigger>
            {isAdmin && <TabsTrigger value="expenses">Gastos Operacionales</TabsTrigger>}
            <TabsTrigger value="reports">Reportes</TabsTrigger>
          </TabsList>

          {/* Tab: Resumen */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {isAdmin ? "Total Facturado" : "Mis Comisiones"}
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€ 0,00</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sin datos registrados aún
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {isAdmin ? "Comisiones Pendientes" : "Pendiente de Cobro"}
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€ 0,00</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sin pagos pendientes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Operaciones Cerradas
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este mes
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>⚠️ Funcionalidad en Desarrollo</CardTitle>
                <CardDescription>
                  Esta sección está en construcción. Próximamente podrás:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✅ Registrar comisiones manualmente</li>
                  <li>✅ Ver historial de pagos</li>
                  <li>✅ Generar reportes personalizados</li>
                  <li>✅ Exportar datos a Excel/PDF</li>
                  {isAdmin && (
                    <>
                      <li>✅ Controlar gastos operacionales</li>
                      <li>✅ Dashboard con gráficos analíticos</li>
                    </>
                  )}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Comisiones */}
          <TabsContent value="commissions">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Comisiones</CardTitle>
                <CardDescription>
                  Registra y controla las comisiones por operación
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Funcionalidad disponible próximamente</p>
                <p className="text-sm mt-2">
                  Mientras tanto, puedes registrar datos manualmente en tu sistema
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Gastos (solo admin) */}
          {isAdmin && (
            <TabsContent value="expenses">
              <Card>
                <CardHeader>
                  <CardTitle>Gastos Operacionales</CardTitle>
                  <CardDescription>
                    Control de costos y gastos de la agencia
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Funcionalidad disponible próximamente</p>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Tab: Reportes */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Reportes Financieros</CardTitle>
                <CardDescription>
                  Genera reportes personalizados de comisiones y ventas
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Funcionalidad disponible próximamente</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ControleFinanceiro;
