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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Logo className="h-8 w-8" />
              <span className="text-xl font-semibold">Imobiliária</span>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm">
                <Home className="mr-2 h-4 w-4" />
                Voltar ao Início
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Simuladores Financeiros</h1>
            <p className="text-lg text-muted-foreground">
              Escolha o tipo de crédito que deseja simular
            </p>
          </div>

          {/* Simulator Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6">
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
