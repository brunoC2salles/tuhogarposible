import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ControleFinanceiro = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Controle Financiero</h1>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Construction className="w-24 h-24 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-foreground">En construcción</h2>
            <p className="text-muted-foreground text-center max-w-md">
              Esta sección estará disponible próximamente con herramientas 
              completas de gestión financiera.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ControleFinanceiro;
