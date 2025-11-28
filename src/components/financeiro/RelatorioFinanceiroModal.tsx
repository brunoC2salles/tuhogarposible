import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ProductInvoice } from '@/hooks/useProductInvoices';
import type { DespesaOperacional } from '@/types/financeiro';
import { generateRelatorioFinanceiroPDF } from '@/lib/relatorioFinanceiroPdfGenerator';

interface RelatorioFinanceiroModalProps {
  open: boolean;
  onClose: () => void;
  invoices: ProductInvoice[];
  despesas: DespesaOperacional[];
}

interface DadosMensais {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
  numFaturas: number;
  numDespesas: number;
}

export const RelatorioFinanceiroModal = ({ open, onClose, invoices, despesas }: RelatorioFinanceiroModalProps) => {
  const chartsRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const currentDate = new Date();
  const firstDayLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  
  const [dataInicio, setDataInicio] = useState(
    format(firstDayLastMonth, 'yyyy-MM')
  );
  const [dataFim, setDataFim] = useState(
    format(currentDate, 'yyyy-MM')
  );

  const calcularDadosMensais = (): DadosMensais[] => {
    const inicio = parseISO(`${dataInicio}-01`);
    const fim = endOfMonth(parseISO(`${dataFim}-01`));
    
    const meses = eachMonthOfInterval({ start: inicio, end: fim });
    
    return meses.map(mes => {
      const mesInicio = startOfMonth(mes);
      const mesFim = endOfMonth(mes);
      
      // Filtrar faturas do mês
      const faturasDoMes = invoices.filter(inv => {
        const dataFatura = new Date(inv.created_at);
        return dataFatura >= mesInicio && dataFatura <= mesFim;
      });
      
      // Filtrar despesas do mês
      const despesasDoMes = despesas.filter(desp => {
        const dataDespesa = new Date(desp.data_despesa);
        return dataDespesa >= mesInicio && dataDespesa <= mesFim;
      });
      
      const receitas = faturasDoMes.reduce((sum, inv) => sum + Number(inv.total), 0);
      const totalDespesas = despesasDoMes.reduce((sum, desp) => sum + Number(desp.valor), 0);
      
      return {
        mes: format(mes, 'MMM yyyy', { locale: ptBR }),
        receitas,
        despesas: totalDespesas,
        saldo: receitas - totalDespesas,
        numFaturas: faturasDoMes.length,
        numDespesas: despesasDoMes.length
      };
    });
  };

  const dadosMensais = calcularDadosMensais();
  
  const totais = dadosMensais.reduce((acc, dado) => ({
    receitas: acc.receitas + dado.receitas,
    despesas: acc.despesas + dado.despesas,
    saldo: acc.saldo + dado.saldo,
    numFaturas: acc.numFaturas + dado.numFaturas,
    numDespesas: acc.numDespesas + dado.numDespesas
  }), { receitas: 0, despesas: 0, saldo: 0, numFaturas: 0, numDespesas: 0 });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleGeneratePDF = async () => {
    if (!chartsRef.current) return;
    
    try {
      setGenerating(true);
      await generateRelatorioFinanceiroPDF(
        chartsRef.current,
        dadosMensais,
        totais,
        dataInicio,
        dataFim
      );
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório Financeiro Mensal</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de Período */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <Label htmlFor="dataInicio">Desde (Mes/Año)</Label>
              <Input
                id="dataInicio"
                type="month"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dataFim">Hasta (Mes/Año)</Label>
              <Input
                id="dataFim"
                type="month"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          {/* Cards de Totais */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-muted-foreground">Total Receitas</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totais.receitas)}</p>
              <p className="text-xs text-muted-foreground mt-1">{totais.numFaturas} faturas</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-muted-foreground">Total Despesas</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totais.despesas)}</p>
              <p className="text-xs text-muted-foreground mt-1">{totais.numDespesas} despesas</p>
            </div>
            <div className={`p-4 rounded-lg border ${totais.saldo >= 0 ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'}`}>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className={`text-2xl font-bold ${totais.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency(totais.saldo)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totais.saldo >= 0 ? 'Superávit' : 'Déficit'}
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-muted-foreground">Taxa de Retorno</p>
              <p className="text-2xl font-bold text-purple-600">
                {totais.despesas > 0 ? ((totais.saldo / totais.despesas) * 100).toFixed(1) : '0'}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">ROI do período</p>
            </div>
          </div>

          {/* Gráficos */}
          <div ref={chartsRef} className="space-y-6">
            {/* Gráfico de Evolução */}
            <div className="p-4 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4">Evolução Financeira</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: 'black' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="receitas" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Receitas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="despesas" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Despesas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saldo" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Saldo"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Barras - Comparativo */}
            <div className="p-4 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4">Comparativo Mensal</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: 'black' }}
                  />
                  <Legend />
                  <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
                  <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Barras - Volume de Operações */}
            <div className="p-4 bg-card rounded-lg border">
              <h3 className="font-semibold mb-4">Volume de Operações</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip labelStyle={{ color: 'black' }} />
                  <Legend />
                  <Bar dataKey="numFaturas" fill="#8b5cf6" name="Nº Faturas" />
                  <Bar dataKey="numDespesas" fill="#f59e0b" name="Nº Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela de Dados */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Mês</th>
                  <th className="p-2 text-right">Receitas</th>
                  <th className="p-2 text-right">Despesas</th>
                  <th className="p-2 text-right">Saldo</th>
                  <th className="p-2 text-center">Faturas</th>
                  <th className="p-2 text-center">Despesas</th>
                </tr>
              </thead>
              <tbody>
                {dadosMensais.map((dado, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">{dado.mes}</td>
                    <td className="p-2 text-right text-green-600 font-medium">{formatCurrency(dado.receitas)}</td>
                    <td className="p-2 text-right text-red-600 font-medium">{formatCurrency(dado.despesas)}</td>
                    <td className={`p-2 text-right font-bold ${dado.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(dado.saldo)}
                    </td>
                    <td className="p-2 text-center">{dado.numFaturas}</td>
                    <td className="p-2 text-center">{dado.numDespesas}</td>
                  </tr>
                ))}
                <tr className="bg-muted font-bold">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-right text-green-600">{formatCurrency(totais.receitas)}</td>
                  <td className="p-2 text-right text-red-600">{formatCurrency(totais.despesas)}</td>
                  <td className={`p-2 text-right ${totais.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {formatCurrency(totais.saldo)}
                  </td>
                  <td className="p-2 text-center">{totais.numFaturas}</td>
                  <td className="p-2 text-center">{totais.numDespesas}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generating}>
            Cerrar
          </Button>
          <Button onClick={handleGeneratePDF} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};