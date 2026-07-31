import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InmovillaCasafariSection } from "@/components/inventario/InmovillaCasafariSection";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, LogOut, Building2, Landmark, Globe, ExternalLink, MapPin, UserCog } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const EXTERNAL_LINKS = {
  bancarios: "https://www.solvia.es/es/login-profesional",
  fueraCartera: "https://www.idealista.com/",
} as const;

const openExternal = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

const AgenteInventario = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Volver</span>
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Logo size="sm" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">Portal del Agente</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Bienvenido, {profile?.nombre}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/agente/visitas">
                <Button variant="outline" size="sm">
                  <MapPin className="w-4 h-4 mr-2" />
                  Visitas
                </Button>
              </Link>
              <Link to="/agente/settings">
                <Button variant="outline" size="sm">
                  <UserCog className="w-4 h-4 mr-2" />
                  Mi Perfil y Disponibilidad
                </Button>
              </Link>

              <AuthButton />

            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="inmovilla" className="w-full">
          <TabsList className="mb-6 grid grid-cols-3 w-full max-w-2xl">
            <TabsTrigger value="inmovilla" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span>Inmovilla</span>
            </TabsTrigger>
            <TabsTrigger value="bancarios" className="gap-2">
              <Landmark className="h-4 w-4" />
              <span className="hidden sm:inline">Productos Bancarios</span>
              <span className="sm:hidden">Bancarios</span>
            </TabsTrigger>
            <TabsTrigger value="fuera-cartera" className="gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Productos Fuera de Cartera</span>
              <span className="sm:hidden">Fuera Cartera</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inmovilla">
            <InmovillaCasafariSection />
          </TabsContent>

          <TabsContent value="bancarios">
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Landmark className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Productos Bancarios</CardTitle>
                <CardDescription className="text-base">
                  Accede al portal profesional de Solvia para consultar productos bancarios
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button size="lg" onClick={() => openExternal(EXTERNAL_LINKS.bancarios)}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Solvia
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fuera-cartera">
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Productos Fuera de Cartera</CardTitle>
                <CardDescription className="text-base">
                  Consulta inmuebles disponibles en Idealista
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button size="lg" onClick={() => openExternal(EXTERNAL_LINKS.fueraCartera)}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Idealista
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AgenteInventario;
