import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { CampoFormulario } from '@/types/contratos';
import logoTuHogar from "@/assets/logo-tu-hogar.png";
import { useAgentes } from '@/hooks/useAgentes';

export default function ContratoPublico() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { agentes, loading: loadingAgentes } = useAgentes();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [linkData, setLinkData] = useState<any>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [contractData, setContractData] = useState<{ contractId: string; filePath: string } | null>(null);

  useEffect(() => {
    loadLinkData();
  }, [token]);

  const loadLinkData = async () => {
    try {
      const { data, error } = await supabase
        .from('public_contract_links')
        .select(`
          *,
          leads:lead_id (nombre_completo, email, telefono),
          contract_templates:template_id (nombre, descripcion, campos_formulario)
        `)
        .eq('token', token)
        .single();

      if (error) throw error;

      // Fetch agent separately
      const { data: agentData } = await supabase
        .from('profiles')
        .select('nombre, email, telefono')
        .eq('id', data.agente_id)
        .single();

      // Add agent data to linkData
      const fullData = {
        ...data,
        profiles: agentData
      };

      if (fullData.status === 'completed') {
        setCompleted(true);
        setLoading(false);
        return;
      }

      if (fullData.status === 'expired' || new Date(fullData.expires_at) < new Date()) {
        toast.error('Este link expirou');
        setLoading(false);
        return;
      }

      setLinkData(fullData);

      // Inicializar campos do formulário
      const campos = fullData.contract_templates.campos_formulario as any as CampoFormulario[];
      const initialValues: Record<string, any> = {};
      
      campos.forEach(campo => {
        // Pre-preencher com dados do lead se disponível
        if (campo.name === 'nombre_completo') {
          initialValues[campo.name] = fullData.leads.nombre_completo;
        } else if (campo.name === 'email') {
          initialValues[campo.name] = fullData.leads.email;
        } else if (campo.name === 'telefono') {
          initialValues[campo.name] = fullData.leads.telefono;
        } else if (campo.name === 'agente_id') {
          // Pré-selecionar agente que criou o link
          initialValues[campo.name] = fullData.agente_id;
        } else {
          initialValues[campo.name] = '';
        }
      });

      setFormValues(initialValues);
    } catch (err: any) {
      console.error('[Contrato Público] Error loading:', err);
      toast.error('Link inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-contract', {
        body: { token, formData: formValues }
      });

      if (error) throw error;

      setContractData({ contractId: data.contractId, filePath: data.filePath });
      setCompleted(true);
      toast.success('Contrato gerado com sucesso!');
    } catch (err: any) {
      console.error('[Contrato Público] Submit error:', err);
      toast.error('Erro ao gerar contrato');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleDownloadContract = async () => {
    if (!contractData?.filePath) return;
    
    try {
      const { data, error } = await supabase.storage
        .from('lead-documents')
        .createSignedUrl(contractData.filePath, 3600);
      
      if (error) throw error;
      
      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      console.error('[Contrato Download] Error:', err);
      toast.error('Error al descargar el contrato');
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-2 sm:p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle>¡Contrato Generado!</CardTitle>
            <CardDescription>
              Su contrato fue generado con éxito. El agente fue notificado y entrará en contacto en breve.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={handleDownloadContract} size="lg">
              Descargar Contrato
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>
              Este link de contrato é inválido ou expirou.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const campos = linkData.contract_templates.campos_formulario as CampoFormulario[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2 border-blue-500 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
          <div className="flex flex-col items-center mb-4">
            <img src={logoTuHogar} alt="Tu hogar posible" className="w-64 mb-4 bg-white p-4 rounded-lg" />
          </div>
          <CardTitle className="text-2xl text-center text-white">
            {linkData.contract_templates.nombre}
          </CardTitle>
          <CardDescription className="text-center text-blue-100 text-sm mt-2">
            {linkData.contract_templates.descripcion || 'Obtén la casa de tus sueños, más accesible y 100% financiada'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {campos.map((campo) => (
              <div key={campo.name} className="space-y-2">
                <Label htmlFor={campo.name}>
                  {campo.label}
                  {campo.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                
                {campo.type === 'agente_select' ? (
                  <select
                    id={campo.name}
                    required={campo.required}
                    value={formValues[campo.name] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [campo.name]: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={loadingAgentes}
                  >
                    <option value="">Seleccione un agente...</option>
                    {agentes.map(agente => (
                      <option key={agente.id} value={agente.id}>
                        {agente.nombre}
                      </option>
                    ))}
                  </select>
                ) : campo.type === 'select' && campo.options ? (
                  <select
                    id={campo.name}
                    required={campo.required}
                    value={formValues[campo.name] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [campo.name]: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {campo.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={campo.name}
                    type={campo.type}
                    required={campo.required}
                    placeholder={campo.placeholder}
                    value={formValues[campo.name] || ''}
                    onChange={(e) => setFormValues(prev => ({ ...prev, [campo.name]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando Contrato...
                </>
              ) : (
                'Firmar y Generar Contrato'
              )}
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground mt-6 pt-6 border-t">
            <p>© 2025 Tu Hogar Posible - Obtén la casa de tus sueños</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
