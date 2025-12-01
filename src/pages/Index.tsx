import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Shield, Calculator, LayoutDashboard, FileText, WalletCards, GraduationCap, MessagesSquare } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
const Index = () => {
  return <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <Logo size="lg" className="h-18 w-20 sm:h-12 sm:w-12 border-0" />
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Tu Hogar Posible</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Plataforma de inventario inmobiliario</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in px-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">Gestiona tu inventario inmobiliario</h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
            Accede como agente para buscar propiedades y solicitar visitas, o como administrador 
            para gestionar el inventario completo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto px-2 sm:px-4">
          <Card className="hover-lift rounded-2xl border-2 hover:border-primary transition-all duration-300">
            <CardHeader className="text-center pb-3 sm:pb-4 px-3 sm:px-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-sky-blue-light rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <CardTitle className="text-lg sm:text-xl md:text-2xl">Portal del Agente</CardTitle>
              <CardDescription className="text-sm sm:text-base md:text-lg">
                Explora propiedades disponibles, filtra por tus criterios y solicita visitas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 px-3 sm:px-6">
              <Link to="/inventario/agente">
                <Button className="w-full text-sm sm:text-base" size="lg">
                  Acceder como Agente
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-lift rounded-2xl border-2 hover:border-primary transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-sky-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Panel de Administración</CardTitle>
              <CardDescription className="text-lg">
                Gestiona propiedades, agentes y reservas. Importa datos desde CSV
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link to="/inventario/admin">
                <Button className="w-full" size="lg">
                  Acceder como Admin
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-lift rounded-2xl border-2 hover:border-primary transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-sky-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Simuladores</CardTitle>
              <CardDescription className="text-lg">
                Accede a herramientas de simulación para cálculos inmobiliarios
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link to="/simuladores">
                <Button className="w-full" size="lg">
                  Acceder a los simuladores
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-lift rounded-2xl border-2 hover:border-primary transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-sky-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
                <LayoutDashboard className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">CRM - Gestión de Leads</CardTitle>
              <CardDescription className="text-lg">
                Gestiona leads, asigna agentes y da seguimiento a oportunidades
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link to="/inventario/agente/crm">
                <Button className="w-full" size="lg">
                  Acceder al CRM
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-lift rounded-2xl border-2 hover:border-primary transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-sky-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Formulario de Cualificación</CardTitle>
              <CardDescription className="text-lg">
                Completa el formulario para evaluar tu elegibilidad y agendar una reunión
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link to="/formulario-qualificacion" target="_blank" rel="noopener noreferrer">
                <Button className="w-full" size="lg">
                  Completar Formulario
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-lift rounded-2xl border-2 hover:border-primary transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-sky-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
                <WalletCards className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Controle Financiero</CardTitle>
              <CardDescription className="text-lg">
                Gestiona ingresos, comisiones y reportes financieros
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link to="/financiero">
                <Button className="w-full" size="lg">
                  Acceder a Finanzas
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-lift rounded-2xl border-2 hover:border-primary transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-sky-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Academia de Agentes</CardTitle>
              <CardDescription className="text-lg">
                Tutoriales, documentos y generador de contratos
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link to="/academia">
                <Button className="w-full" size="lg">
                  Acceder a la Academia
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover-lift rounded-2xl border-2 hover:border-primary transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-sky-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
                <MessagesSquare className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Chat Interno</CardTitle>
              <CardDescription className="text-lg">
                Comunícate con tu equipo en tiempo real
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link to="/chat">
                <Button className="w-full" size="lg">
                  Acceder al Chat
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>;
};
export default Index;