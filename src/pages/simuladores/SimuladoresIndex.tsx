import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, Home, TrendingUp } from 'lucide-react';
import Logo from '@/components/Logo';

const SimuladoresIndex = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
              <Logo className="h-6 w-6 sm:h-8 sm:w-8" />
              <span className="text-base sm:text-lg md:text-xl font-semibold">Tu Hogar Posible</span>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm">
                <Home className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Voltar ao Início</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-6 sm:py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Simuladores Financeiros</h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground px-2">
              Escolha o tipo de crédito que deseja simular
            </p>
          </div>

          {/* Simulator Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Personal Credit Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
              <Link to="/simuladores/credito-personal" className="block">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Calculator className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Crédito Personal</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    Simule seu crédito pessoal com taxas competitivas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <span className="text-sm text-muted-foreground">Prazos de 5 a 12 anos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <span className="text-sm text-muted-foreground">Taxas de juros personalizadas</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <span className="text-sm text-muted-foreground">Cálculo de amortização francesa</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <span className="text-sm text-muted-foreground">Análise de capacidade de pagamento</span>
                    </li>
                  </ul>
                  <Button className="w-full" size="lg">
                    Iniciar Simulação
                  </Button>
                </CardContent>
              </Link>
            </Card>

            {/* Mortgage Credit Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary">
              <Link to="/simuladores/credito-hipotecario" className="block">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Crédito Hipotecário</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    Simule sua hipoteca com condições especiais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <span className="text-sm text-muted-foreground">Financiamento até 100% do valor</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <span className="text-sm text-muted-foreground">Benefícios fiscais incluídos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <span className="text-sm text-muted-foreground">Condições especiais para família numerosa</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">✓</span>
                      <span className="text-sm text-muted-foreground">Descontos para menores de 35 anos</span>
                    </li>
                  </ul>
                  <Button className="w-full" size="lg">
                    Iniciar Simulação
                  </Button>
                </CardContent>
              </Link>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Os resultados são apenas simulações e não constituem uma oferta de crédito.
              <br />
              As condições finais estarão sujeitas à análise de crédito.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SimuladoresIndex;
