import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useLeadServices, calculateServicesTotal, LeadServices as LeadServicesType } from '@/hooks/useLeadServices';
import { Loader2, Save, Building2 } from 'lucide-react';

interface LeadServicesProps {
  leadId: string;
  propertyPrice?: number;
}

const FIXED_SERVICES = {
  nota_simples: 30,
  tasaciones: 600,
  beneficios: 290,
  inspeccion_tecnica: 3350,
  iva_incluido: 400
};

export const LeadServicesComponent = ({ leadId, propertyPrice = 0 }: LeadServicesProps) => {
  const { services, isLoading, saveServices } = useLeadServices(leadId);
  
  const [formData, setFormData] = useState({
    property_price: propertyPrice,
    nota_simples: false,
    tasaciones: false,
    beneficios: false,
    inspeccion_tecnica: false,
    iva_incluido: false,
    comision_vivienda: false,
    comision_vivienda_percent: 1,
    exclusivo: false,
    credito: false,
    credito_valor: 300,
    hipoteca: false,
    hipoteca_percent: 0.4,
    client_company_name: '',
    client_address: '',
    client_dni_nif: '',
    client_email: ''
  });

  useEffect(() => {
    if (services) {
      setFormData({
        property_price: services.property_price || propertyPrice,
        nota_simples: services.nota_simples || false,
        tasaciones: services.tasaciones || false,
        beneficios: services.beneficios || false,
        inspeccion_tecnica: services.inspeccion_tecnica || false,
        iva_incluido: services.iva_incluido || false,
        comision_vivienda: services.comision_vivienda || false,
        comision_vivienda_percent: services.comision_vivienda_percent || 1,
        exclusivo: services.exclusivo || false,
        credito: services.credito || false,
        credito_valor: services.credito_valor || 300,
        hipoteca: services.hipoteca || false,
        hipoteca_percent: services.hipoteca_percent || 0.4,
        client_company_name: services.client_company_name || '',
        client_address: services.client_address || '',
        client_dni_nif: services.client_dni_nif || '',
        client_email: services.client_email || ''
      });
    } else if (propertyPrice > 0) {
      setFormData(prev => ({ ...prev, property_price: propertyPrice }));
    }
  }, [services, propertyPrice]);

  const { subtotal, ivaAmount, total } = calculateServicesTotal(formData);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleSave = () => {
    saveServices.mutate({
      lead_id: leadId,
      ...formData
    } as any);
  };

  const maxComisionPercent = formData.exclusivo ? 7 : 3;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Precio del inmueble */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Datos del Inmueble
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="property_price">Precio de la Vivienda (€)</Label>
            <Input
              id="property_price"
              type="number"
              value={formData.property_price}
              onChange={(e) => setFormData({ ...formData, property_price: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Servicios */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Servicios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Servicios Fijos */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="nota_simples" 
                checked={formData.nota_simples} 
                onCheckedChange={(checked) => setFormData({ ...formData, nota_simples: checked as boolean })} 
              />
              <Label htmlFor="nota_simples" className="cursor-pointer flex-1">
                Nota Simples - {formatCurrency(FIXED_SERVICES.nota_simples)}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="tasaciones" 
                checked={formData.tasaciones} 
                onCheckedChange={(checked) => setFormData({ ...formData, tasaciones: checked as boolean })} 
              />
              <Label htmlFor="tasaciones" className="cursor-pointer flex-1">
                Tasaciones - {formatCurrency(FIXED_SERVICES.tasaciones)}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="beneficios" 
                checked={formData.beneficios} 
                onCheckedChange={(checked) => setFormData({ ...formData, beneficios: checked as boolean })} 
              />
              <Label htmlFor="beneficios" className="cursor-pointer flex-1">
                Beneficios - {formatCurrency(FIXED_SERVICES.beneficios)}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="inspeccion_tecnica" 
                checked={formData.inspeccion_tecnica} 
                onCheckedChange={(checked) => setFormData({ ...formData, inspeccion_tecnica: checked as boolean })} 
              />
              <Label htmlFor="inspeccion_tecnica" className="cursor-pointer flex-1">
                Inspección Técnica - {formatCurrency(FIXED_SERVICES.inspeccion_tecnica)}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="iva_incluido" 
                checked={formData.iva_incluido} 
                onCheckedChange={(checked) => setFormData({ ...formData, iva_incluido: checked as boolean })} 
              />
              <Label htmlFor="iva_incluido" className="cursor-pointer flex-1">
                IVA Incluido - {formatCurrency(FIXED_SERVICES.iva_incluido)}
              </Label>
            </div>
          </div>

          {/* Servicios Variables */}
          <div className="space-y-4 pt-4 border-t">
            {/* Comisión Vivienda */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="comision_vivienda" 
                  checked={formData.comision_vivienda} 
                  onCheckedChange={(checked) => setFormData({ ...formData, comision_vivienda: checked as boolean })} 
                />
                <Label htmlFor="comision_vivienda" className="cursor-pointer">
                  Comisión de Vivienda (1-{maxComisionPercent}% del valor)
                </Label>
              </div>
              {formData.comision_vivienda && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="exclusivo" 
                      checked={formData.exclusivo} 
                      onCheckedChange={(checked) => setFormData({ ...formData, exclusivo: checked as boolean })} 
                    />
                    <Label htmlFor="exclusivo" className="cursor-pointer text-sm text-primary">
                      Acuerdo Exclusivo (permite hasta 7%)
                    </Label>
                  </div>
                  <div>
                    <Label htmlFor="comision_percent">Porcentaje (%)</Label>
                    <Input
                      id="comision_percent"
                      type="number"
                      step="0.1"
                      min="1"
                      max={maxComisionPercent}
                      value={formData.comision_vivienda_percent}
                      onChange={(e) => setFormData({ ...formData, comision_vivienda_percent: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Crédito */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="credito" 
                  checked={formData.credito} 
                  onCheckedChange={(checked) => setFormData({ ...formData, credito: checked as boolean })} 
                />
                <Label htmlFor="credito" className="cursor-pointer">Crédito (300-500€)</Label>
              </div>
              {formData.credito && (
                <div className="ml-6">
                  <Label htmlFor="credito_valor">Valor (€)</Label>
                  <Input
                    id="credito_valor"
                    type="number"
                    min="300"
                    max="500"
                    value={formData.credito_valor}
                    onChange={(e) => setFormData({ ...formData, credito_valor: parseFloat(e.target.value) || 300 })}
                  />
                </div>
              )}
            </div>

            {/* Hipoteca */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hipoteca" 
                  checked={formData.hipoteca} 
                  onCheckedChange={(checked) => setFormData({ ...formData, hipoteca: checked as boolean })} 
                />
                <Label htmlFor="hipoteca" className="cursor-pointer">Hipoteca (0.1-0.7% del valor)</Label>
              </div>
              {formData.hipoteca && (
                <div className="ml-6">
                  <Label htmlFor="hipoteca_percent">Porcentaje (%)</Label>
                  <Input
                    id="hipoteca_percent"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="0.7"
                    value={formData.hipoteca_percent}
                    onChange={(e) => setFormData({ ...formData, hipoteca_percent: parseFloat(e.target.value) || 0.4 })}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos del Cliente (Imobiliária) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Datos del Cliente (Imobiliária)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client_company_name">Nombre de la Empresa</Label>
              <Input
                id="client_company_name"
                value={formData.client_company_name}
                onChange={(e) => setFormData({ ...formData, client_company_name: e.target.value })}
                placeholder="Ej: Solvia, Clickalia..."
              />
            </div>
            <div>
              <Label htmlFor="client_dni_nif">DNI/NIF</Label>
              <Input
                id="client_dni_nif"
                value={formData.client_dni_nif}
                onChange={(e) => setFormData({ ...formData, client_dni_nif: e.target.value })}
              />
            </div>
            <div className="col-span-full">
              <Label htmlFor="client_address">Dirección</Label>
              <Input
                id="client_address"
                value={formData.client_address}
                onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="client_email">Email</Label>
              <Input
                id="client_email"
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Totales */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA (21%):</span>
              <span className="font-semibold">{formatCurrency(ivaAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={saveServices.isPending}
        className="w-full"
      >
        {saveServices.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-2" />
        )}
        Guardar Servicios
      </Button>
    </div>
  );
};
