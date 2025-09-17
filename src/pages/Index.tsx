import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Logo size="lg" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tu Hogar Posible</h1>
              <p className="text-muted-foreground mt-2">Plataforma de inventario inmobiliario</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl font-bold mb-4">Gestiona tu inventario inmobiliario</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Accede como agente para buscar propiedades y solicitar visitas, o como administrador 
            para gestionar el inventario completo.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover-lift rounded-2xl border-2 hover:border-primary transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-sky-blue-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Portal del Agente</CardTitle>
              <CardDescription className="text-lg">
                Explora propiedades disponibles, filtra por tus criterios y solicita visitas
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Link to="/inventario/agente">
                <Button className="w-full" size="lg">
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
        </div>
      </main>
    </div>
  );
};

export default Index;