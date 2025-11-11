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

export default function ContratoPublico() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [linkData, setLinkData] = useState<any>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

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
        } else if (campo.name === 'agente_nombre') {
          initialValues[campo.name] = fullData.profiles?.nombre || '';
        } else if (campo.name === 'agente_email') {
          initialValues[campo.name] = fullData.profiles?.email || '';
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

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle>Contrato Enviado!</CardTitle>
            <CardDescription>
              Seu contrato foi gerado com sucesso. O agente foi notificado e entrará em contato em breve.
            </CardDescription>
          </CardHeader>
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
    <div className="min-h-screen bg-background p-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{linkData.contract_templates.nombre}</CardTitle>
            <CardDescription>
              {linkData.contract_templates.descripcion || 'Preencha os dados abaixo para gerar seu contrato'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {campos.map((campo) => (
                <div key={campo.name} className="space-y-2">
                  <Label htmlFor={campo.name}>
                    {campo.label}
                    {campo.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  
                  {campo.type === 'select' && campo.options ? (
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

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando Contrato...
                  </>
                ) : (
                  'Gerar Contrato'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
