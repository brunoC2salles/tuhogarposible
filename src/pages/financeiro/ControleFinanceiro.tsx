import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, FileText, Plus, Edit, Trash2 } from "lucide-react";
import { useDespesas } from "@/hooks/useDespesas";
import { useFaturacoes } from "@/hooks/useFaturacoes";
import { DespesaModal } from "@/components/financeiro/DespesaModal";
import { FaturacaoModal } from "@/components/financeiro/FaturacaoModal";
import type { DespesaOperacional, Faturacao } from "@/types/financeiro";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAgentes } from "@/hooks/useAgentes";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ControleFinanceiro = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { agentes } = useAgentes();

  const { despesas, isLoading: loadingDespesas, createDespesa, updateDespesa, deleteDespesa } = useDespesas();
  const { faturacoes, isLoading: loadingFaturacoes, createFaturacao, updateFaturacao, deleteFaturacao } = useFaturacoes();

  const [despesaModalOpen, setDespesaModalOpen] = useState(false);
  const [faturacaoModalOpen, setFaturacaoModalOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<DespesaOperacional | null>(null);
  const [editingFaturacao, setEditingFaturacao] = useState<Faturacao | null>(null);
  const [filtroAgente, setFiltroAgente] = useState<string>("todos");

  // Filtrar dados por agente
  const despesasFiltradas = filtroAgente === "todos" 
    ? despesas 
    : despesas.filter(d => d.agente_id === filtroAgente);
  
  const faturacoesFiltradas = filtroAgente === "todos"
    ? faturacoes
    : faturacoes.filter(f => f.agente_id === filtroAgente);

  const totalDespesas = despesasFiltradas.reduce((sum, d) => sum + Number(d.valor), 0);
  const totalFaturacoes = faturacoesFiltradas.reduce((sum, f) => sum + Number(f.valor), 0);
  const totalPendente = faturacoesFiltradas.filter(f => f.status === 'pendente').reduce((sum, f) => sum + Number(f.valor), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getAgenteName = (agenteId?: string) => {
    if (!agenteId) return '-';
    const agente = agentes.find(a => a.id === agenteId);
    return agente?.nombre || '-';
  };

  const handleSaveDespesa = (despesa: Partial<DespesaOperacional>) => {
    if (despesa.id) {
      updateDespesa.mutate(despesa as any);
    } else {
      createDespesa.mutate(despesa as any);
    }
    setEditingDespesa(null);
  };

  const handleSaveFaturacao = (faturacao: Partial<Faturacao>) => {
    if (faturacao.id) {
      updateFaturacao.mutate(faturacao as any);
    } else {
      createFaturacao.mutate(faturacao as any);
    }
    setEditingFaturacao(null);
  };

  const handleEditDespesa = (despesa: DespesaOperacional) => {
    setEditingDespesa(despesa);
    setDespesaModalOpen(true);
  };

  const handleEditFaturacao = (faturacao: Faturacao) => {
    setEditingFaturacao(faturacao);
    setFaturacaoModalOpen(true);
  };

  const handleDeleteDespesa = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
      deleteDespesa.mutate(id);
    }
  };

  const handleDeleteFaturacao = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta faturação?')) {
      deleteFaturacao.mutate(id);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Acesso Restrito</CardTitle>
              <CardDescription>
                Apenas administradores podem acessar o controle financeiro.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Control Financiero</h1>
            <p className="text-muted-foreground mt-2">
              Gestión completa de gastos operacionales y facturación
            </p>
          </div>
          
          {isAdmin && agentes.length > 0 && (
            <div className="w-64">
              <Label htmlFor="filtroAgente">Filtrar por Agente</Label>
              <Select value={filtroAgente} onValueChange={setFiltroAgente}>
                <SelectTrigger id="filtroAgente">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los Agentes</SelectItem>
                  {agentes.map((agente) => (
                    <SelectItem key={agente.id} value={agente.id}>
                      {agente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="expenses">Gastos Operacionales</TabsTrigger>
            <TabsTrigger value="invoicing">Facturación</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalFaturacoes)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {faturacoes.length} faturações registradas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total em Despesas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalDespesas)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {despesas.length} despesas registradas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendente de Cobrança</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalPendente)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Faturações com status pendente
                  </p>
                </CardContent>
              </Card>
            </div>

          <Card>
            <CardHeader>
              <CardTitle>Balance General</CardTitle>
              <CardDescription>Resumo financeiro do período</CardDescription>
            </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Receitas (Facturação):</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(totalFaturacoes)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Despesas Operacionais:</span>
                    <span className="text-sm font-bold text-red-600">-{formatCurrency(totalDespesas)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between items-center">
                    <span className="font-medium">Resultado:</span>
                    <span className={`font-bold ${totalFaturacoes - totalDespesas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totalFaturacoes - totalDespesas)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gastos Operacionales</CardTitle>
                    <CardDescription>Registro y control de todas las despesas</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingDespesa(null); setDespesaModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Despesa
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingDespesas ? (
                  <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                ) : despesasFiltradas.length === 0 ? (
                   <p className="text-center py-8 text-muted-foreground">
                     {filtroAgente === "todos" ? "Nenhuma despesa registrada" : "Nenhuma despesa para este agente"}
                   </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Método</TableHead>
                        {isAdmin && <TableHead>Agente</TableHead>}
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {despesasFiltradas.map((despesa) => (
                        <TableRow key={despesa.id}>
                          <TableCell>{formatDate(despesa.data_despesa)}</TableCell>
                          <TableCell>{despesa.descricao}</TableCell>
                          <TableCell><Badge variant="outline">{despesa.categoria}</Badge></TableCell>
                          <TableCell>{despesa.metodo_pagamento || '-'}</TableCell>
                          {isAdmin && <TableCell>{getAgenteName(despesa.agente_id)}</TableCell>}
                          <TableCell className="text-right font-medium">{formatCurrency(Number(despesa.valor))}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEditDespesa(despesa)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteDespesa(despesa.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoicing">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Facturación</CardTitle>
                    <CardDescription>Gestión de facturas y cobros</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingFaturacao(null); setFaturacaoModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Faturação
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingFaturacoes ? (
                  <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                ) : faturacoesFiltradas.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    {filtroAgente === "todos" ? "Nenhuma faturação registrada" : "Nenhuma faturação para este agente"}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Nº Fatura</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Descrição</TableHead>
                        {isAdmin && <TableHead>Agente</TableHead>}
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {faturacoesFiltradas.map((faturacao) => (
                        <TableRow key={faturacao.id}>
                          <TableCell>{formatDate(faturacao.data_faturacao)}</TableCell>
                          <TableCell>{faturacao.numero_fatura || '-'}</TableCell>
                          <TableCell>{faturacao.cliente_nome || '-'}</TableCell>
                          <TableCell>{faturacao.descricao}</TableCell>
                          {isAdmin && <TableCell>{getAgenteName(faturacao.agente_id)}</TableCell>}
                          <TableCell>
                            <Badge variant={
                              faturacao.status === 'pago' ? 'default' : 
                              faturacao.status === 'pendente' ? 'secondary' : 
                              'destructive'
                            }>
                              {faturacao.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(faturacao.valor))}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEditFaturacao(faturacao)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteFaturacao(faturacao.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DespesaModal
        open={despesaModalOpen}
        onClose={() => { setDespesaModalOpen(false); setEditingDespesa(null); }}
        onSave={handleSaveDespesa}
        despesa={editingDespesa}
      />

      <FaturacaoModal
        open={faturacaoModalOpen}
        onClose={() => { setFaturacaoModalOpen(false); setEditingFaturacao(null); }}
        onSave={handleSaveFaturacao}
        faturacao={editingFaturacao}
      />
    </div>
  );
};

export default ControleFinanceiro;
