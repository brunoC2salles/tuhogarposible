import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calculator, GraduationCap, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const Index = () => {
  const cards = [
    {
      title: "Portal del Agente",
      description: "Accede a Inmovilla, productos bancarios y fuera de cartera",
      icon: Users,
      to: "/inventario/agente",
      cta: "Acceder como Agente",
      show: true,
    },
    {
      title: "Academia y Documentos",
      description: "Tutoriales, documentos y materiales de capacitación",
      icon: GraduationCap,
      to: "/academia",
      cta: "Acceder a la Academia",
      show: true,
    },
    {
      title: "Simulador Financiero",
      description: "Calcula crédito personal e hipotecario en un único formulario",
      icon: Calculator,
      to: "/simuladores",
      cta: "Acceder al Simulador",
      show: true,
    },
    {
      title: "Panel de Administración",
      description: "CRM, agentes, financiero, verificaciones y más",
      icon: Shield,
      to: "/admin",
      cta: "Acceder como Admin",
      show: true,
    },
  ];

  const visible = cards.filter((c) => c.show);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="flex justify-center">
          <Logo size="lg" className="border-0" />
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12 animate-fade-in px-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">
            Bienvenido a Tu Hogar Posible
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
            Elige una de las áreas disponibles para continuar.
          </p>
        </div>

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 ${
            visible.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
          } gap-4 sm:gap-6 max-w-6xl mx-auto px-2 sm:px-4`}
        >
          {visible.map(({ title, description, icon: Icon, to, cta }) => (
            <Card
              key={title}
              className="hover-lift rounded-2xl border-2 hover:border-primary transition-all duration-300 flex flex-col"
            >
              <CardHeader className="text-center pb-3 sm:pb-4 px-3 sm:px-6 flex-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 px-3 sm:px-6">
                <Link to={to}>
                  <Button className="w-full text-sm sm:text-base" size="lg">
                    {cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
