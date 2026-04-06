import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Info } from "lucide-react";
import Logo from "@/components/Logo";

const INMOVILLA_URL = "https://crm.tuhogarposible.net/login";

export const InmovillaCasafariSection = () => {
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
          <div>
              <CardTitle className="text-lg">
                Compartición Inmobiliarias
              </CardTitle>
              <CardDescription>
                Accede al catálogo completo de propiedades
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={INMOVILLA_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir en nueva pestaña
            </a>
          </Button>
        </div>
        
      </CardHeader>
      
      <CardContent className="p-0">
        <iframe
          src={INMOVILLA_URL}
          className="w-full border-0 rounded-b-lg"
          style={{ height: "800px" }}
          title="Casafari - Tu Hogar Posible"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
        />
      </CardContent>
    </Card>
  );
};
