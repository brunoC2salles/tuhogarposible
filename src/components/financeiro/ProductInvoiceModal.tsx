import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAgentes } from "@/hooks/useAgentes";
import { useLeads } from "@/hooks/useLeads";
import type { ProductInvoice } from "@/hooks/useProductInvoices";
import { Loader2 } from "lucide-react";
import { DEFAULT_SERVICE_COSTS } from "@/types/financeiro";

interface ProductInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (invoice: Omit<ProductInvoice, 'id' | 'invoice_number' | 'created_at' | 'updated_at' | 'created_by'>) => void;
  invoice?: ProductInvoice | null;
  saving?: boolean;
}

const FIXED_SERVICES = {
  nota_simples: 30,
  tasaciones: 600,
  beneficios: 290,
  inspeccion_tecnica: 3350,
  iva_incluido: 400
};

export const ProductInvoiceModal = ({ open, onClose, onSave, invoice, saving }: ProductInvoiceModalProps) => {
  const { agentes } = useAgentes();
  const { leads } = useLeads();

  const [facturacionDirecta, setFacturacionDirecta] = useState(false);

  const [formData, setFormData] = useState({
    lead_id: "",
    lead_name: "",
    property_price: "",
    monto_directo: "",
    descripcion_directa: "",
    aplicar_iva: true,
    agent_id: "",
    client_company_name: "",
    client_address: "",
    client_dni_nif: "",
    client_email: "",
    nota_simples: false,
    tasaciones: false,
    beneficios: false,
    inspeccion_tecnica: false,
    iva_incluido: false,
    comision_vivienda: false,
    comision_vivienda_percent: "1",
    exclusivo: false,
    credito: false,
    credito_valor: "300",
    hipoteca: false,
    hipoteca_percent: "0.4",
    payment_due_date: ""
  });

  // Service costs state (editable)
  const [serviceCosts, setServiceCosts] = useState<Record<string, number>>({...DEFAULT_SERVICE_COSTS});

  useEffect(() => {
    if (invoice) {
      const isDirecta = !!invoice.monto_directo && !invoice.property_price;
      setFacturacionDirecta(isDirecta);
      setFormData({
        lead_id: invoice.lead_id || "",
        lead_name: invoice.lead_name,
        property_price: invoice.property_price?.toString() || "",
        monto_directo: invoice.monto_directo?.toString() || "",
        descripcion_directa: invoice.descripcion_directa || "",
        aplicar_iva: invoice.aplicar_iva !== false,
        agent_id: invoice.agent_id || "",
        client_company_name: invoice.client_company_name,
        client_address: invoice.client_address,
        client_dni_nif: invoice.client_dni_nif,
        client_email: invoice.client_email,
        nota_simples: invoice.nota_simples,
        tasaciones: invoice.tasaciones,
        beneficios: invoice.beneficios,
        inspeccion_tecnica: invoice.inspeccion_tecnica,
        iva_incluido: invoice.iva_incluido,
        comision_vivienda: invoice.comision_vivienda,
        comision_vivienda_percent: invoice.comision_vivienda_percent?.toString() || "1",
        exclusivo: false,
        credito: invoice.credito,
        credito_valor: invoice.credito_valor?.toString() || "300",
        hipoteca: invoice.hipoteca,
        hipoteca_percent: invoice.hipoteca_percent?.toString() || "0.4",
        payment_due_date: invoice.payment_due_date ? new Date(invoice.payment_due_date).toISOString().split('T')[0] : ""
      });
      // Load saved service costs or defaults
      const savedCosts = (invoice as any).service_costs || {};
      setServiceCosts({...DEFAULT_SERVICE_COSTS, ...savedCosts});
    } else {
      setFacturacionDirecta(false);
      setFormData({
        lead_id: "",
        lead_name: "",
        property_price: "",
        monto_directo: "",
        descripcion_directa: "",
        aplicar_iva: true,
        agent_id: "",
        client_company_name: "",
        client_address: "",
        client_dni_nif: "",
        client_email: "",
        nota_simples: false,
        tasaciones: false,
        beneficios: false,
        inspeccion_tecnica: false,
        iva_incluido: false,
        comision_vivienda: false,
        comision_vivienda_percent: "1",
        exclusivo: false,
        credito: false,
        credito_valor: "300",
        hipoteca: false,
        hipoteca_percent: "0.4",
        payment_due_date: ""
      });
      setServiceCosts({...DEFAULT_SERVICE_COSTS});
    }
  }, [invoice, open]);

  const handleLeadChange = (leadId: string) => {
    const selectedLead = leads.find(l => l.id === leadId);
    if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        lead_id: leadId,
        lead_name: selectedLead.nombre_completo,
        agent_id: selectedLead.agente_asignado_id || ""
      }));
    }
  };

  const calculateSubtotal = () => {
    if (facturacionDirecta) {
      return parseFloat(formData.monto_directo) || 0;
    }

    let subtotal = 0;
    const propertyPrice = parseFloat(formData.property_price) || 0;

    if (formData.nota_simples) subtotal += FIXED_SERVICES.nota_simples;
    if (formData.tasaciones) subtotal += FIXED_SERVICES.tasaciones;
    if (formData.beneficios) subtotal += FIXED_SERVICES.beneficios;
    if (formData.inspeccion_tecnica) subtotal += FIXED_SERVICES.inspeccion_tecnica;
    if (formData.iva_incluido) subtotal += FIXED_SERVICES.iva_incluido;
    
    if (formData.comision_vivienda) {
      const maxPercent = formData.exclusivo ? 7 : 3;
      const percent = Math.min(parseFloat(formData.comision_vivienda_percent) || 0, maxPercent);
      subtotal += propertyPrice * (percent / 100);
    }
    
    if (formData.credito) {
      subtotal += parseFloat(formData.credito_valor) || 0;
    }
    
    if (formData.hipoteca) {
      const percent = parseFloat(formData.hipoteca_percent) || 0;
      subtotal += propertyPrice * (percent / 100);
    }

    return subtotal;
  };

  const calculateTotalCost = () => {
    if (facturacionDirecta) return 0;

    let totalCost = 0;
    if (formData.nota_simples) totalCost += serviceCosts.nota_simples || 0;
    if (formData.tasaciones) totalCost += serviceCosts.tasaciones || 0;
    if (formData.beneficios) totalCost += serviceCosts.beneficios || 0;
    if (formData.inspeccion_tecnica) totalCost += serviceCosts.inspeccion_tecnica || 0;
    if (formData.iva_incluido) totalCost += serviceCosts.iva_incluido || 0;
    if (formData.comision_vivienda) totalCost += serviceCosts.comision_vivienda || 0;
    if (formData.credito) totalCost += serviceCosts.credito || 0;
    if (formData.hipoteca) totalCost += serviceCosts.hipoteca || 0;
    return totalCost;
  };

  const subtotal = calculateSubtotal();
  const ivaAmount = facturacionDirecta 
    ? (formData.aplicar_iva ? subtotal * 0.21 : 0)
    : subtotal * 0.21;
  const total = subtotal + ivaAmount;
  const totalServiceCost = calculateTotalCost();
  const netCompany = total - totalServiceCost;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (facturacionDirecta) {
      if (!formData.lead_name || !formData.monto_directo || !formData.descripcion_directa || !formData.client_company_name ||
          !formData.client_address || !formData.client_dni_nif || !formData.client_email || !formData.payment_due_date) {
        return;
      }
    } else {
      if (!formData.lead_name || !formData.property_price || !formData.client_company_name ||
          !formData.client_address || !formData.client_dni_nif || !formData.client_email || !formData.payment_due_date) {
        return;
      }
    }

    // Build service_costs object with only selected services
    const selectedServiceCosts: Record<string, number> = {};
    if (!facturacionDirecta) {
      if (formData.nota_simples) selectedServiceCosts.nota_simples = serviceCosts.nota_simples;
      if (formData.tasaciones) selectedServiceCosts.tasaciones = serviceCosts.tasaciones;
      if (formData.beneficios) selectedServiceCosts.beneficios = serviceCosts.beneficios;
      if (formData.inspeccion_tecnica) selectedServiceCosts.inspeccion_tecnica = serviceCosts.inspeccion_tecnica;
      if (formData.iva_incluido) selectedServiceCosts.iva_incluido = serviceCosts.iva_incluido;
      if (formData.comision_vivienda) selectedServiceCosts.comision_vivienda = serviceCosts.comision_vivienda;
      if (formData.credito) selectedServiceCosts.credito = serviceCosts.credito;
      if (formData.hipoteca) selectedServiceCosts.hipoteca = serviceCosts.hipoteca;
    }

    onSave({
      lead_id: formData.lead_id || undefined,
      lead_name: formData.lead_name,
      property_price: facturacionDirecta ? undefined : parseFloat(formData.property_price),
      monto_directo: facturacionDirecta ? parseFloat(formData.monto_directo) : undefined,
      descripcion_directa: facturacionDirecta ? formData.descripcion_directa : undefined,
      aplicar_iva: facturacionDirecta ? formData.aplicar_iva : true,
      agent_id: formData.agent_id || undefined,
      client_company_name: formData.client_company_name,
      client_address: formData.client_address,
      client_dni_nif: formData.client_dni_nif,
      client_email: formData.client_email,
      nota_simples: facturacionDirecta ? false : formData.nota_simples,
      tasaciones: facturacionDirecta ? false : formData.tasaciones,
      beneficios: facturacionDirecta ? false : formData.beneficios,
      inspeccion_tecnica: facturacionDirecta ? false : formData.inspeccion_tecnica,
      iva_incluido: facturacionDirecta ? false : formData.iva_incluido,
      comision_vivienda: facturacionDirecta ? false : formData.comision_vivienda,
      comision_vivienda_percent: !facturacionDirecta && formData.comision_vivienda ? parseFloat(formData.comision_vivienda_percent) : undefined,
      credito: facturacionDirecta ? false : formData.credito,
      credito_valor: !facturacionDirecta && formData.credito ? parseFloat(formData.credito_valor) : undefined,
      hipoteca: facturacionDirecta ? false : formData.hipoteca,
      hipoteca_percent: !facturacionDirecta && formData.hipoteca ? parseFloat(formData.hipoteca_percent) : undefined,
      payment_due_date: formData.payment_due_date,
      subtotal,
      iva_amount: ivaAmount,
      total,
      status: 'generada',
      // New cost fields
      service_costs: selectedServiceCosts,
      total_service_cost: totalServiceCost,
      net_company: netCompany
    } as any);
  };

  const updateServiceCost = (service: string, value: string) => {
    setServiceCosts(prev => ({
      ...prev,
      [service]: parseFloat(value) || 0
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? "Editar Factura" : "Nueva Factura de Productos"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Toggle Facturación Directa */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div>
              <Label htmlFor="facturacion-directa" className="text-base font-semibold">Facturación Directa</Label>
              <p className="text-sm text-muted-foreground">
                Activar para facturar un monto fijo sin relación a un inmueble
              </p>
            </div>
            <Switch
              id="facturacion-directa"
              checked={facturacionDirecta}
              onCheckedChange={setFacturacionDirecta}
            />
          </div>

          {/* Datos Básicos */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Datos Básicos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lead">Lead *</Label>
                <Select value={formData.lead_id || "manual"} onValueChange={handleLeadChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Entrada Manual</SelectItem>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.lead_id === "" && (
                <div>
                  <Label htmlFor="lead_name">Nombre del Lead *</Label>
                  <Input
                    id="lead_name"
                    value={formData.lead_name}
                    onChange={(e) => setFormData({ ...formData, lead_name: e.target.value })}
                    required
                  />
                </div>
              )}

              {facturacionDirecta ? (
                <>
                  <div>
                    <Label htmlFor="monto_directo">Monto a Facturar (€) *</Label>
                    <Input
                      id="monto_directo"
                      type="number"
                      step="0.01"
                      value={formData.monto_directo}
                      onChange={(e) => setFormData({ ...formData, monto_directo: e.target.value })}
                      placeholder="Ej: 1500.00"
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="aplicar_iva"
                      checked={formData.aplicar_iva}
                      onCheckedChange={(checked) => setFormData({ ...formData, aplicar_iva: checked as boolean })}
                    />
                    <Label htmlFor="aplicar_iva" className="cursor-pointer">Aplicar IVA (21%)</Label>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="descripcion_directa">Descripción del Servicio *</Label>
                    <Textarea
                      id="descripcion_directa"
                      value={formData.descripcion_directa}
                      onChange={(e) => setFormData({ ...formData, descripcion_directa: e.target.value })}
                      placeholder="Ej: Servicio de consultoría inmobiliaria"
                      required
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Esta descripción aparecerá en la factura como concepto del servicio
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <Label htmlFor="property_price">Precio de la Vivienda (€) *</Label>
                  <Input
                    id="property_price"
                    type="number"
                    step="0.01"
                    value={formData.property_price}
                    onChange={(e) => setFormData({ ...formData, property_price: e.target.value })}
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="agent">Agente</Label>
                <Select value={formData.agent_id || "none"} onValueChange={(val) => setFormData({ ...formData, agent_id: val === "none" ? "" : val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar agente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {agentes.map((agente) => (
                      <SelectItem key={agente.id} value={agente.id}>
                        {agente.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Cliente a Facturar</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_company_name">Nombre de la Empresa *</Label>
                <Input
                  id="client_company_name"
                  value={formData.client_company_name}
                  onChange={(e) => setFormData({ ...formData, client_company_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="client_dni_nif">DNI/NIF *</Label>
                <Input
                  id="client_dni_nif"
                  value={formData.client_dni_nif}
                  onChange={(e) => setFormData({ ...formData, client_dni_nif: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="client_address">Dirección *</Label>
                <Input
                  id="client_address"
                  value={formData.client_address}
                  onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="client_email">Email *</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="payment_due_date">Fecha de Vencimiento *</Label>
                <Input
                  id="payment_due_date"
                  type="date"
                  value={formData.payment_due_date}
                  onChange={(e) => setFormData({ ...formData, payment_due_date: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Servicios - Only show if NOT direct invoicing */}
          {!facturacionDirecta && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-lg">Servicios Prestados</h3>
              <p className="text-xs text-muted-foreground">Marque los servicios y edite el coste real de cada uno</p>
              
              {/* Servicios Fijos */}
              <div className="space-y-3">
                {/* Nota Simples */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="nota_simples" checked={formData.nota_simples} onCheckedChange={(checked) => setFormData({ ...formData, nota_simples: checked as boolean })} />
                    <Label htmlFor="nota_simples" className="cursor-pointer">Nota Simples - {formatCurrency(FIXED_SERVICES.nota_simples)}</Label>
                  </div>
                  {formData.nota_simples && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Coste:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={serviceCosts.nota_simples}
                        onChange={(e) => updateServiceCost('nota_simples', e.target.value)}
                        className="w-20 h-7 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Tasaciones */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="tasaciones" checked={formData.tasaciones} onCheckedChange={(checked) => setFormData({ ...formData, tasaciones: checked as boolean })} />
                    <Label htmlFor="tasaciones" className="cursor-pointer">Tasaciones - {formatCurrency(FIXED_SERVICES.tasaciones)}</Label>
                  </div>
                  {formData.tasaciones && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Coste:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={serviceCosts.tasaciones}
                        onChange={(e) => updateServiceCost('tasaciones', e.target.value)}
                        className="w-20 h-7 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Beneficios */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="beneficios" checked={formData.beneficios} onCheckedChange={(checked) => setFormData({ ...formData, beneficios: checked as boolean })} />
                    <Label htmlFor="beneficios" className="cursor-pointer">Beneficios - {formatCurrency(FIXED_SERVICES.beneficios)}</Label>
                  </div>
                  {formData.beneficios && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Coste:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={serviceCosts.beneficios}
                        onChange={(e) => updateServiceCost('beneficios', e.target.value)}
                        className="w-20 h-7 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Inspección Técnica */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="inspeccion_tecnica" checked={formData.inspeccion_tecnica} onCheckedChange={(checked) => setFormData({ ...formData, inspeccion_tecnica: checked as boolean })} />
                    <Label htmlFor="inspeccion_tecnica" className="cursor-pointer">Inspección Técnica - {formatCurrency(FIXED_SERVICES.inspeccion_tecnica)}</Label>
                  </div>
                  {formData.inspeccion_tecnica && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Coste:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={serviceCosts.inspeccion_tecnica}
                        onChange={(e) => updateServiceCost('inspeccion_tecnica', e.target.value)}
                        className="w-20 h-7 text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* IVA Incluido */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="iva_incluido" checked={formData.iva_incluido} onCheckedChange={(checked) => setFormData({ ...formData, iva_incluido: checked as boolean })} />
                    <Label htmlFor="iva_incluido" className="cursor-pointer">IVA Incluido - {formatCurrency(FIXED_SERVICES.iva_incluido)}</Label>
                  </div>
                  {formData.iva_incluido && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Coste:</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={serviceCosts.iva_incluido}
                        onChange={(e) => updateServiceCost('iva_incluido', e.target.value)}
                        className="w-20 h-7 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Servicios Variables */}
              <div className="space-y-4 pt-4 border-t">
                {/* Comisión Vivienda */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="comision_vivienda" checked={formData.comision_vivienda} onCheckedChange={(checked) => setFormData({ ...formData, comision_vivienda: checked as boolean })} />
                      <Label htmlFor="comision_vivienda" className="cursor-pointer">Comisión de Vivienda (1-{formData.exclusivo ? '7' : '3'}% del valor)</Label>
                    </div>
                  </div>
                  {formData.comision_vivienda && (
                    <div className="ml-6 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="exclusivo" 
                          checked={formData.exclusivo} 
                          onCheckedChange={(checked) => setFormData({ ...formData, exclusivo: checked as boolean })} 
                        />
                        <Label htmlFor="exclusivo" className="cursor-pointer text-sm">Acuerdo Exclusivo (hasta 7%)</Label>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Porcentaje:</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="1"
                            max={formData.exclusivo ? "7" : "3"}
                            value={formData.comision_vivienda_percent}
                            onChange={(e) => setFormData({ ...formData, comision_vivienda_percent: e.target.value })}
                            className="w-20 h-8"
                          />
                          <span className="text-sm">%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Coste:</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={serviceCosts.comision_vivienda}
                            onChange={(e) => updateServiceCost('comision_vivienda', e.target.value)}
                            className="w-20 h-7 text-xs"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        = {formatCurrency((parseFloat(formData.property_price) || 0) * (parseFloat(formData.comision_vivienda_percent) || 0) / 100)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Crédito */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="credito" checked={formData.credito} onCheckedChange={(checked) => setFormData({ ...formData, credito: checked as boolean })} />
                      <Label htmlFor="credito" className="cursor-pointer">Crédito (€300-500)</Label>
                    </div>
                  </div>
                  {formData.credito && (
                    <div className="ml-6 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Valor:</Label>
                        <Input
                          type="number"
                          step="1"
                          min="300"
                          max="500"
                          value={formData.credito_valor}
                          onChange={(e) => setFormData({ ...formData, credito_valor: e.target.value })}
                          className="w-24 h-8"
                        />
                        <span className="text-sm">€</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Coste:</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={serviceCosts.credito}
                          onChange={(e) => updateServiceCost('credito', e.target.value)}
                          className="w-20 h-7 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Hipoteca */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="hipoteca" checked={formData.hipoteca} onCheckedChange={(checked) => setFormData({ ...formData, hipoteca: checked as boolean })} />
                      <Label htmlFor="hipoteca" className="cursor-pointer">Hipoteca (0.1-0.7% del valor)</Label>
                    </div>
                  </div>
                  {formData.hipoteca && (
                    <div className="ml-6 flex flex-col gap-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Porcentaje:</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="0.7"
                            value={formData.hipoteca_percent}
                            onChange={(e) => setFormData({ ...formData, hipoteca_percent: e.target.value })}
                            className="w-20 h-8"
                          />
                          <span className="text-sm">%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Coste:</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={serviceCosts.hipoteca}
                            onChange={(e) => updateServiceCost('hipoteca', e.target.value)}
                            className="w-20 h-7 text-xs"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        = {formatCurrency((parseFloat(formData.property_price) || 0) * (parseFloat(formData.hipoteca_percent) || 0) / 100)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Totales */}
          <div className="border-t pt-4 space-y-2 bg-muted/30 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA (21%):</span>
              <span className="font-medium">{formatCurrency(ivaAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total Factura:</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
            {!facturacionDirecta && (
              <>
                <div className="flex justify-between text-sm text-muted-foreground border-t pt-2">
                  <span>Coste Total Servicios:</span>
                  <span className="text-destructive">-{formatCurrency(totalServiceCost)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Neto Empresa:</span>
                  <span className="text-green-600">{formatCurrency(netCompany)}</span>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {invoice ? "Actualizar" : "Crear Factura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};