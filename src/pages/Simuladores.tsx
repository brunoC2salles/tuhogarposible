import { Link } from "react-router-dom";
import { ArrowLeft, Calculator, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { SimuladorCreditoPersonal } from "@/components/simuladores/SimuladorCreditoPersonal";
import { SimuladorCreditoHipotecario } from "@/components/simuladores/SimuladorCreditoHipotecario";

const Simuladores = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo />
              <div>
                <h1 className="text-xl font-bold">Tu Hogar Posible</h1>
                <p className="text-sm text-muted-foreground">Simuladores Financieros</p>
              </div>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Simuladores Financieros</h2>
            <p className="text-muted-foreground text-lg">
              Herramientas para calcular y planificar tu inversión inmobiliaria
            </p>
          </div>

          {/* Simuladores Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Simulador de Crédito Personal */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Calculator className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Simulador de Crédito Personal</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Calcula tu cuota mensual, intereses y verifica tu capacidad de financiación 
                  para la compra de tu inmueble ideal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Sistema de amortización francesa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Análisis de cualificación crediticia</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Exportación de resultados en PDF</span>
                  </li>
                </ul>
                <SimuladorCreditoPersonal />
              </CardContent>
            </Card>

            {/* Simulador de Crédito Hipotecario */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Home className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Simulador de Crédito Hipotecario</CardTitle>
                </div>
                <CardDescription className="text-base">
                  Calcula el financiamiento hipotecario hasta el 100% del valor de la vivienda,
                  con análisis de gastos por comunidad y capacidad de endeudamiento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Financiamiento configurable hasta 100% del valor</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Cálculo de gastos por comunidad autónoma</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Descuentos por familia numerosa y menores de 35 años</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Análisis de capacidad de endeudamiento (30%)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>Exportación de resultados en PDF</span>
                  </li>
                </ul>
                <SimuladorCreditoHipotecario />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Simuladores;
