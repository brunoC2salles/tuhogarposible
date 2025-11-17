import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, FileText, Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
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
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-2 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground truncate">Control Financiero</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Gestión completa de gastos operacionales y facturación
                </p>
              </div>
            </div>
          
          {isAdmin && agentes.length > 0 && (
            <div className="w-full sm:w-64">
              <Label htmlFor="filtroAgente" className="text-xs sm:text-sm">Filtrar por Agente</Label>
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
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="expenses">Gastos Operacionales</TabsTrigger>
            <TabsTrigger value="invoicing">Facturación</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Facturado</CardTitle>
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalFaturacoes)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {faturacoes.length} faturações
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total em Despesas</CardTitle>
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalDespesas)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {despesas.length} despesas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Pendente</CardTitle>
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-xl sm:text-2xl font-bold">{formatCurrency(totalPendente)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status pendente
                  </p>
                </CardContent>
              </Card>
            </div>

          <Card>
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">Balance General</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Resumo financeiro do período</CardDescription>
            </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium">Receitas (Facturación):</span>
                    <span className="text-xs sm:text-sm font-bold text-green-600">{formatCurrency(totalFaturacoes)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium">Despesas:</span>
                    <span className="text-xs sm:text-sm font-bold text-red-600">-{formatCurrency(totalDespesas)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between items-center">
                    <span className="text-sm sm:text-base font-medium">Resultado:</span>
                    <span className={`text-sm sm:text-base font-bold ${totalFaturacoes - totalDespesas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totalFaturacoes - totalDespesas)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Gastos Operacionales</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Registro y control de todas las despesas</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingDespesa(null); setDespesaModalOpen(true); }} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden xs:inline">Adicionar </span>Despesa
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                {loadingDespesas ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Carregando...</p>
                ) : despesasFiltradas.length === 0 ? (
                   <p className="text-center py-8 text-muted-foreground text-sm">
                     {filtroAgente === "todos" ? "Nenhuma despesa registrada" : "Nenhuma despesa para este agente"}
                   </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs whitespace-nowrap">Data</TableHead>
                          <TableHead className="text-xs whitespace-nowrap">Descrição</TableHead>
                          <TableHead className="text-xs whitespace-nowrap">Categoria</TableHead>
                          <TableHead className="text-xs whitespace-nowrap">Método</TableHead>
                          {isAdmin && <TableHead className="text-xs whitespace-nowrap">Agente</TableHead>}
                          <TableHead className="text-right text-xs whitespace-nowrap">Valor</TableHead>
                          <TableHead className="text-right text-xs whitespace-nowrap">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {despesasFiltradas.map((despesa) => (
                          <TableRow key={despesa.id}>
                            <TableCell className="text-xs whitespace-nowrap">{formatDate(despesa.data_despesa)}</TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate">{despesa.descricao}</TableCell>
                            <TableCell className="text-xs"><Badge variant="outline" className="text-xs">{despesa.categoria}</Badge></TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{despesa.metodo_pagamento || '-'}</TableCell>
                            {isAdmin && <TableCell className="text-xs whitespace-nowrap">{getAgenteName(despesa.agente_id)}</TableCell>}
                            <TableCell className="text-right font-medium text-xs whitespace-nowrap">{formatCurrency(Number(despesa.valor))}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="outline" onClick={() => handleEditDespesa(despesa)} className="h-7 w-7 p-0">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteDespesa(despesa.id)} className="h-7 w-7 p-0">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoicing">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Facturación</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Gestión de facturas y cobros</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingFaturacao(null); setFaturacaoModalOpen(true); }} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden xs:inline">Adicionar </span>Faturação
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-0 sm:px-6">
                {loadingFaturacoes ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Carregando...</p>
                ) : faturacoesFiltradas.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    {filtroAgente === "todos" ? "Nenhuma faturação registrada" : "Nenhuma faturação para este agente"}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs whitespace-nowrap">Data</TableHead>
                          <TableHead className="text-xs whitespace-nowrap">Nº Fatura</TableHead>
                          <TableHead className="text-xs whitespace-nowrap">Cliente</TableHead>
                          <TableHead className="text-xs whitespace-nowrap">Descrição</TableHead>
                          {isAdmin && <TableHead className="text-xs whitespace-nowrap">Agente</TableHead>}
                          <TableHead className="text-xs whitespace-nowrap">Status</TableHead>
                          <TableHead className="text-right text-xs whitespace-nowrap">Valor</TableHead>
                          <TableHead className="text-right text-xs whitespace-nowrap">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {faturacoesFiltradas.map((faturacao) => (
                          <TableRow key={faturacao.id}>
                            <TableCell className="text-xs whitespace-nowrap">{formatDate(faturacao.data_faturacao)}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{faturacao.numero_fatura || '-'}</TableCell>
                            <TableCell className="text-xs max-w-[120px] truncate">{faturacao.cliente_nome || '-'}</TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate">{faturacao.descricao}</TableCell>
                            {isAdmin && <TableCell className="text-xs whitespace-nowrap">{getAgenteName(faturacao.agente_id)}</TableCell>}
                            <TableCell className="text-xs">
                              <Badge variant={
                                faturacao.status === 'pago' ? 'default' : 
                                faturacao.status === 'pendente' ? 'secondary' : 
                                'destructive'
                              } className="text-xs">
                                {faturacao.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-xs whitespace-nowrap">{formatCurrency(Number(faturacao.valor))}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="outline" onClick={() => handleEditFaturacao(faturacao)} className="h-7 w-7 p-0">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteFaturacao(faturacao.id)} className="h-7 w-7 p-0">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
