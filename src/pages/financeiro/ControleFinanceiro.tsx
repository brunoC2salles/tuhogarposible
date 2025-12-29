import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, FileText, Plus, Edit, Trash2, Download, Loader2, Check, Wallet, Users, Calendar } from "lucide-react";
import { useDespesas } from "@/hooks/useDespesas";
import { useProductInvoices } from "@/hooks/useProductInvoices";
import { useAgentVariableCosts, BRUNO_SALLES_ID } from "@/hooks/useAgentVariableCosts";
import { DespesaModal } from "@/components/financeiro/DespesaModal";
import { ProductInvoiceModal } from "@/components/financeiro/ProductInvoiceModal";
import type { DespesaOperacional } from "@/types/financeiro";
import type { ProductInvoice } from "@/hooks/useProductInvoices";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR, es } from "date-fns/locale";
import { useAgentes } from "@/hooks/useAgentes";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateInvoicePDF } from "@/lib/invoicePdfGenerator";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

const ControleFinanceiro = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { agentes } = useAgentes();

  const { despesas, isLoading: loadingDespesas, createDespesa, updateDespesa, deleteDespesa } = useDespesas();
  const { invoices, isLoading: loadingInvoices, createInvoice, updateInvoice, deleteInvoice, markAsPaid } = useProductInvoices();
  const { costs: variableCosts, isLoading: loadingCosts, markAsPaid: markCostAsPaid, deleteCost, createCost } = useAgentVariableCosts();

  const [despesaModalOpen, setDespesaModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<DespesaOperacional | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<ProductInvoice | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [filtroAgente, setFiltroAgente] = useState<string>("todos");
  
  // Period filter state
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  // Bruno commission percentage (editable)
  const [brunoPercent, setBrunoPercent] = useState(5);
  const [generatingBrunoCommission, setGeneratingBrunoCommission] = useState(false);

  // Leads query for "firmadas" count (finalized leads)
  const { data: leadsFirmadas } = useQuery({
    queryKey: ['leads-firmadas', selectedMonth, selectedYear],
    queryFn: async () => {
      const start = startOfMonth(new Date(selectedYear, selectedMonth));
      const end = endOfMonth(new Date(selectedYear, selectedMonth));
      
      const { data, error } = await supabase
        .from('leads')
        .select('id')
        .eq('stage', 'finalizada')
        .gte('last_stage_change_at', start.toISOString())
        .lte('last_stage_change_at', end.toISOString());
      
      if (error) throw error;
      return data;
    }
  });

  // Filter data by period
  const periodStart = startOfMonth(new Date(selectedYear, selectedMonth));
  const periodEnd = endOfMonth(new Date(selectedYear, selectedMonth));

  const filterByPeriod = <T extends { created_at?: string; data_despesa?: string }>(items: T[], dateField: keyof T) => {
    return items.filter(item => {
      const dateStr = item[dateField] as string;
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return isWithinInterval(date, { start: periodStart, end: periodEnd });
    });
  };

  // Filter by period first, then by agent
  const despesasPeriod = filterByPeriod(despesas, 'data_despesa');
  const invoicesPeriod = filterByPeriod(invoices, 'created_at');
  const costsPeriod = filterByPeriod(variableCosts, 'created_at');

  const despesasFiltradas = filtroAgente === "todos" 
    ? despesasPeriod 
    : despesasPeriod.filter(d => d.agente_id === filtroAgente);
  
  const invoicesFiltradas = filtroAgente === "todos"
    ? invoicesPeriod
    : invoicesPeriod.filter(f => f.agent_id === filtroAgente);

  // Calculate totals for selected period
  const totalDespesas = despesasFiltradas.reduce((sum, d) => sum + Number(d.valor), 0);
  const totalInvoices = invoicesFiltradas.reduce((sum, f) => sum + Number(f.total), 0);
  const totalPendente = invoicesFiltradas.filter(f => f.status !== 'pagada' && !f.paid_at).reduce((sum, f) => sum + Number(f.total), 0);
  const totalPaidInvoices = invoicesFiltradas.filter(f => f.status === 'pagada' || f.paid_at).reduce((sum, f) => sum + Number(f.total), 0);
  const totalServiceCosts = invoicesFiltradas.reduce((sum, f) => sum + Number((f as any).total_service_cost || 0), 0);
  const totalNetCompany = invoicesFiltradas.reduce((sum, f) => sum + Number((f as any).net_company || f.total), 0);

  // Bruno's commission calculation
  const brunoCommissionAmount = totalPaidInvoices * (brunoPercent / 100);
  
  // Check if Bruno's commission for this month already exists
  const existingBrunoCommission = costsPeriod.find(c => 
    c.agent_id === BRUNO_SALLES_ID && 
    c.description.includes(`${format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: es })}`)
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getInvoiceStatus = (invoice: ProductInvoice) => {
    if (invoice.status === 'pagada' || invoice.paid_at) {
      return { label: 'Pagada', color: 'bg-green-500' };
    }
    
    if (invoice.payment_due_date) {
      const dueDate = new Date(invoice.payment_due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        return { label: 'Caducada', color: 'bg-red-500' };
      }
    }
    
    return { label: 'Generada', color: 'bg-yellow-500' };
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    if (confirm('¿Marcar esta factura como pagada?')) {
      await markAsPaid.mutateAsync(invoiceId);
    }
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

  const handleSaveInvoice = (invoice: Omit<ProductInvoice, 'id' | 'invoice_number' | 'created_at' | 'updated_at' | 'created_by'>) => {
    if (editingInvoice) {
      updateInvoice.mutate({ ...invoice, id: editingInvoice.id } as any);
    } else {
      createInvoice.mutate(invoice as any);
    }
    setEditingInvoice(null);
  };

  const handleEditDespesa = (despesa: DespesaOperacional) => {
    setEditingDespesa(despesa);
    setDespesaModalOpen(true);
  };

  const handleEditInvoice = (invoice: ProductInvoice) => {
    setEditingInvoice(invoice);
    setInvoiceModalOpen(true);
  };

  const handleDeleteDespesa = (id: string) => {
    if (confirm('¿Está seguro de eliminar este gasto?')) {
      deleteDespesa.mutate(id);
    }
  };

  const handleDeleteInvoice = (id: string) => {
    if (confirm('¿Está seguro de eliminar esta factura?')) {
      deleteInvoice.mutate(id);
    }
  };

  const handleGeneratePDF = async (invoice: ProductInvoice) => {
    try {
      setGeneratingPdf(invoice.id);
      await generateInvoicePDF(invoice);
      toast.success('Factura generada y descargada');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar factura');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleGenerateBrunoCommission = async () => {
    if (existingBrunoCommission) {
      toast.error('La comisión de este mes ya fue generada');
      return;
    }
    
    if (totalPaidInvoices === 0) {
      toast.error('No hay facturas pagadas en este período');
      return;
    }

    setGeneratingBrunoCommission(true);
    try {
      const monthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: es });
      await createCost.mutateAsync({
        agent_id: BRUNO_SALLES_ID,
        description: `Comisión Socio ${brunoPercent}% - ${monthName}`,
        amount: brunoCommissionAmount,
        status: 'pendiente'
      });
      toast.success('Comisión del socio generada correctamente');
    } catch (error) {
      toast.error('Error al generar comisión');
    } finally {
      setGeneratingBrunoCommission(false);
    }
  };

  // Generate month options for filter
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const monthName = format(new Date(2024, i, 1), 'MMMM', { locale: es });
    return {
      value: i,
      label: monthName.charAt(0).toUpperCase() + monthName.slice(1)
    };
  });

  const yearOptions = [2024, 2025, 2026].map(y => ({ value: y, label: y.toString() }));

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto p-8">
          <Card>
            <CardHeader>
              <CardTitle>Acceso Restringido</CardTitle>
              <CardDescription>
                Solo los administradores pueden acceder al control financiero.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Period Filter */}
          <div className="flex gap-2">
            <div>
              <Label className="text-xs">Mes</Label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Año</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y.value} value={y.value.toString()}>
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Agent Filter */}
          {agentes.length > 0 && (
            <div className="sm:ml-auto">
              <Label className="text-xs">Filtrar por Agente</Label>
              <Select value={filtroAgente} onValueChange={setFiltroAgente}>
                <SelectTrigger className="w-48">
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
            <TabsTrigger value="expenses">Gastos</TabsTrigger>
            <TabsTrigger value="invoicing">Facturación</TabsTrigger>
            <TabsTrigger value="variable-costs">Comisiones</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
                  <CardTitle className="text-xs font-medium">Total Facturado</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-lg font-bold">{formatCurrency(totalInvoices)}</div>
                  <p className="text-xs text-muted-foreground">{invoicesFiltradas.length} facturas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
                  <CardTitle className="text-xs font-medium">Total Gastos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-lg font-bold">{formatCurrency(totalDespesas)}</div>
                  <p className="text-xs text-muted-foreground">{despesasFiltradas.length} gastos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
                  <CardTitle className="text-xs font-medium">Pendiente</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-lg font-bold">{formatCurrency(totalPendente)}</div>
                  <p className="text-xs text-muted-foreground">Por cobrar</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 pt-3">
                  <CardTitle className="text-xs font-medium">Op. Firmadas</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="text-lg font-bold">{leadsFirmadas?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Leads finalizados</p>
                </CardContent>
              </Card>
            </div>

            {/* Balance General */}
            <Card>
              <CardHeader className="px-4">
                <CardTitle className="text-base">Balance General - {format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: es })}</CardTitle>
              </CardHeader>
              <CardContent className="px-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Facturado:</span>
                    <span className="font-bold text-green-600">{formatCurrency(totalInvoices)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Coste de Servicios:</span>
                    <span className="font-bold text-orange-600">-{formatCurrency(totalServiceCosts)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Gastos Operacionales:</span>
                    <span className="font-bold text-red-600">-{formatCurrency(totalDespesas)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="font-medium">Neto Empresa:</span>
                    <span className={`font-bold ${totalNetCompany - totalDespesas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totalNetCompany - totalDespesas)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bruno Commission Section */}
            <Card className="border-primary/20">
              <CardHeader className="px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Comisión Socio (Bruno)
                </CardTitle>
                <CardDescription>Basado en el {brunoPercent}% del faturamiento bruto total pagado del mes</CardDescription>
              </CardHeader>
              <CardContent className="px-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Total Pagado del Mes</Label>
                      <p className="text-lg font-bold">{formatCurrency(totalPaidInvoices)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Porcentaje</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          value={brunoPercent}
                          onChange={(e) => setBrunoPercent(parseFloat(e.target.value) || 5)}
                          className="w-20 h-8"
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor Comisión</Label>
                      <p className="text-lg font-bold text-primary">{formatCurrency(brunoCommissionAmount)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Estado</Label>
                      {existingBrunoCommission ? (
                        <Badge className={existingBrunoCommission.status === 'pagado' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {existingBrunoCommission.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No generada</Badge>
                      )}
                    </div>
                  </div>
                  
                  {!existingBrunoCommission && (
                    <Button 
                      onClick={handleGenerateBrunoCommission} 
                      disabled={generatingBrunoCommission || totalPaidInvoices === 0}
                      className="w-full sm:w-auto"
                    >
                      {generatingBrunoCommission && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Generar Comisión del Mes
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Comissões por Agente */}
            <Card>
              <CardHeader className="px-4">
                <CardTitle className="text-base">Comisiones por Agente</CardTitle>
                <CardDescription className="text-xs">Split de ingresos basado en facturas pagadas del período</CardDescription>
              </CardHeader>
              <CardContent className="px-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Agente</TableHead>
                        <TableHead className="text-xs text-right">% Comisión</TableHead>
                        <TableHead className="text-xs text-right">Total Facturado</TableHead>
                        <TableHead className="text-xs text-right">Comisión Agente</TableHead>
                        <TableHead className="text-xs text-right">Ingreso Empresa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agentes.map((agente) => {
                        const agenteInvoices = invoicesPeriod.filter(
                          (inv) => inv.agent_id === agente.id && (inv.status === 'pagada' || inv.paid_at)
                        );
                        const totalFacturado = agenteInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
                        const comisionPercentage = agente.comision_porcentaje || 0;
                        const comisionAgente = totalFacturado * (comisionPercentage / 100);
                        const receitaEmpresa = totalFacturado - comisionAgente;

                        if (agenteInvoices.length === 0) return null;

                        return (
                          <TableRow key={agente.id}>
                            <TableCell className="text-xs font-medium">{agente.nombre}</TableCell>
                            <TableCell className="text-xs text-right">
                              <Badge variant="secondary">{comisionPercentage}%</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-right font-medium">{formatCurrency(totalFacturado)}</TableCell>
                            <TableCell className="text-xs text-right text-primary font-medium">
                              {formatCurrency(comisionAgente)}
                            </TableCell>
                            <TableCell className="text-xs text-right text-green-600 font-medium">
                              {formatCurrency(receitaEmpresa)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader className="px-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Gastos Operacionales</CardTitle>
                    <CardDescription className="text-xs">Registro y control de todos los gastos</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingDespesa(null); setDespesaModalOpen(true); }} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Gasto
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-0 sm:px-4">
                {loadingDespesas ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Cargando...</p>
                ) : despesasFiltradas.length === 0 ? (
                   <p className="text-center py-8 text-muted-foreground text-sm">
                     No hay gastos en este período
                   </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Fecha</TableHead>
                          <TableHead className="text-xs">Descripción</TableHead>
                          <TableHead className="text-xs">Categoría</TableHead>
                          <TableHead className="text-xs">Método</TableHead>
                          <TableHead className="text-xs">Agente</TableHead>
                          <TableHead className="text-right text-xs">Valor</TableHead>
                          <TableHead className="text-right text-xs">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {despesasFiltradas.map((despesa) => (
                          <TableRow key={despesa.id}>
                            <TableCell className="text-xs">{formatDate(despesa.data_despesa)}</TableCell>
                            <TableCell className="text-xs max-w-[150px] truncate">{despesa.descricao}</TableCell>
                            <TableCell className="text-xs"><Badge variant="outline" className="text-xs">{despesa.categoria}</Badge></TableCell>
                            <TableCell className="text-xs">{despesa.metodo_pagamento || '-'}</TableCell>
                            <TableCell className="text-xs">{getAgenteName(despesa.agente_id)}</TableCell>
                            <TableCell className="text-right font-medium text-xs">{formatCurrency(Number(despesa.valor))}</TableCell>
                            <TableCell className="text-right">
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
              <CardHeader className="px-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Facturación de Productos</CardTitle>
                    <CardDescription className="text-xs">Gestión de facturas y servicios</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingInvoice(null); setInvoiceModalOpen(true); }} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Factura
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-0 sm:px-4">
                {loadingInvoices ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Cargando...</p>
                ) : invoicesFiltradas.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    No hay facturas en este período
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Nº Factura</TableHead>
                          <TableHead className="text-xs">Lead</TableHead>
                          <TableHead className="text-xs">Cliente</TableHead>
                          <TableHead className="text-xs">Agente</TableHead>
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                          <TableHead className="text-xs text-right">Coste</TableHead>
                          <TableHead className="text-xs text-right">Neto</TableHead>
                          <TableHead className="text-right text-xs">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoicesFiltradas.map((invoice) => {
                          const status = getInvoiceStatus(invoice);
                          const serviceCost = Number((invoice as any).total_service_cost || 0);
                          const netCompany = Number((invoice as any).net_company || invoice.total);
                          return (
                            <TableRow key={invoice.id}>
                              <TableCell className="text-xs">{invoice.invoice_number}</TableCell>
                              <TableCell className="text-xs max-w-[100px] truncate">{invoice.lead_name}</TableCell>
                              <TableCell className="text-xs max-w-[120px] truncate">{invoice.client_company_name}</TableCell>
                              <TableCell className="text-xs">{getAgenteName(invoice.agent_id)}</TableCell>
                              <TableCell className="text-xs">
                                <Badge className={status.color}>{status.label}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium text-xs">{formatCurrency(Number(invoice.total))}</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {serviceCost > 0 ? `-${formatCurrency(serviceCost)}` : '-'}
                              </TableCell>
                              <TableCell className="text-right text-xs text-green-600 font-medium">{formatCurrency(netCompany)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {status.label !== 'Pagada' && (
                                    <Button size="sm" variant="outline" onClick={() => handleMarkAsPaid(invoice.id)} className="h-7 px-2 bg-green-50 hover:bg-green-100">
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(invoice)} disabled={generatingPdf === invoice.id} className="h-7 w-7 p-0">
                                    {generatingPdf === invoice.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleEditInvoice(invoice)} className="h-7 w-7 p-0">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleDeleteInvoice(invoice.id)} className="h-7 w-7 p-0">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variable Costs Tab */}
          <TabsContent value="variable-costs">
            <Card>
              <CardHeader className="px-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Comisiones Pendientes
                    </CardTitle>
                    <CardDescription className="text-xs">Comisiones de agentes y socio pendientes de pago</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 sm:px-4">
                {loadingCosts ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Cargando...</p>
                ) : costsPeriod.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No hay comisiones en este período</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Agente</TableHead>
                          <TableHead className="text-xs">Descripción</TableHead>
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="text-right text-xs">Valor</TableHead>
                          <TableHead className="text-xs">Fecha</TableHead>
                          <TableHead className="text-right text-xs">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costsPeriod.map((cost) => (
                          <TableRow key={cost.id}>
                            <TableCell className="text-xs">{getAgenteName(cost.agent_id)}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{cost.description}</TableCell>
                            <TableCell className="text-xs">
                              <Badge className={cost.status === 'pagado' ? 'bg-green-500' : 'bg-yellow-500'}>
                                {cost.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-xs text-primary">
                              {formatCurrency(Number(cost.amount))}
                            </TableCell>
                            <TableCell className="text-xs">
                              {formatDate(cost.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {cost.status !== 'pagado' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => markCostAsPaid.mutate(cost.id)} 
                                    className="h-7 px-2 bg-green-50 hover:bg-green-100"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  onClick={() => { if (confirm('¿Eliminar esta comisión?')) deleteCost.mutate(cost.id); }} 
                                  className="h-7 w-7 p-0"
                                >
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

        <DespesaModal
          open={despesaModalOpen}
          onClose={() => { setDespesaModalOpen(false); setEditingDespesa(null); }}
          onSave={handleSaveDespesa}
          despesa={editingDespesa}
        />

        <ProductInvoiceModal
          open={invoiceModalOpen}
          onClose={() => { setInvoiceModalOpen(false); setEditingInvoice(null); }}
          onSave={handleSaveInvoice}
          invoice={editingInvoice}
          saving={createInvoice.isPending || updateInvoice.isPending}
        />
      </div>
    </AdminLayout>
  );
};

export default ControleFinanceiro;