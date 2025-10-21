import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import { SimuladorCreditoPersonal } from '@/components/simuladores/SimuladorCreditoPersonal';

const SimuladorPersonalPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Logo className="h-8 w-8" />
              <span className="text-xl font-semibold">Imobiliária</span>
            </Link>
            <Link to="/simuladores">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar aos Simuladores
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Simulador de Crédito Personal</h1>
            <p className="text-muted-foreground">
              Preencha os dados abaixo para calcular as condições do seu crédito pessoal
            </p>
          </div>

          <SimuladorCreditoPersonal />
        </div>
      </main>
    </div>
  );
};

export default SimuladorPersonalPage;
