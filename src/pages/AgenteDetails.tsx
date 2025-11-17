import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Phone, Calendar, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAgentStatistics } from '@/hooks/useAgentStatistics';
import { useLeads } from '@/hooks/useLeads';
import { LeadKanban } from '@/components/crm/LeadKanban';
import { LeadDetailsModal } from '@/components/crm/LeadDetailsModal';
import { SimuladoresModal } from '@/components/crm/SimuladoresModal';
import { RecomendacionesModal } from '@/components/crm/RecomendacionesModal';
import { Lead, STAGE_LABELS, LeadStage } from '@/types/crm';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Agent {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  region_round_robin: string | null;
  tidycal_url: string | null;
  created_at: string;
  activo: boolean;
}

export default function AgenteDetails() {
  const { agenteId } = useParams<{ agenteId: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const { statistics } = useAgentStatistics(agenteId);
  const { leads, loading: leadsLoading, updateLeadStage } = useLeads();
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [simulatorsModalOpen, setSimulatorsModalOpen] = useState(false);
  const [recomendacionesModalOpen, setRecomendacionesModalOpen] = useState(false);

  useEffect(() => {
    if (agenteId) {
      fetchAgent();
    }
  }, [agenteId]);

  const fetchAgent = async () => {
    if (!agenteId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', agenteId)
        .single();

      if (error) throw error;
      setAgent(data);
    } catch (err) {
      console.error('[AgenteDetails] Error fetching agent:', err);
    } finally {
      setLoading(false);
    }
  };

  const agentLeads = leads.filter(lead => lead.agente_asignado_id === agenteId);

  const chartData = statistics?.stage_counts
    ? Object.entries(statistics.stage_counts).map(([stage, count]) => ({
        name: STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage,
        cantidad: count,
      }))
    : [];

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsModalOpen(true);
  };

  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    await updateLeadStage(leadId, newStage);
  };

  const handleEdit = (lead: Lead) => {
    // Não implementado ainda
  };

  const handleDelete = async (leadId: string) => {
    // Não implementado ainda
  };

  const handleOpenSimulators = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsModalOpen(false);
    setSimulatorsModalOpen(true);
  };

  const handleOpenRecomendaciones = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsModalOpen(false);
    setRecomendacionesModalOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-center text-muted-foreground">Agente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/agentes')}>
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">{agent.nombre}</h1>
          <div className="flex items-center gap-2 mt-1 sm:mt-2 flex-wrap">
            <Badge variant={agent.activo ? "default" : "secondary"} className="text-xs">
              {agent.activo ? 'Activo' : 'Inactivo'}
            </Badge>
            {agent.region_round_robin && (
              <Badge variant="outline" className="text-xs">{agent.region_round_robin}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Información de Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{agent.email}</p>
            </div>
            {agent.telefono && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Teléfono
                </p>
                <p className="font-medium">{agent.telefono}</p>
              </div>
            )}
            {agent.tidycal_url && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Tidycal
                </p>
                <a 
                  href={agent.tidycal_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Ver calendario
                </a>
              </div>
            )}
            {agent.region_round_robin && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Región Round Robin
                </p>
                <p className="font-medium">{agent.region_round_robin}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Estadísticas de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {statistics ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{statistics.total_leads}</p>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{statistics.converted_leads}</p>
                  <p className="text-sm text-muted-foreground">Convertidos</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{statistics.conversion_rate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Tasa de Conversión</p>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">Sin estadísticas</p>
            )}
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cantidad" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leads del Agente ({agentLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <p className="text-center text-muted-foreground py-8">Cargando leads...</p>
          ) : agentLeads.length > 0 ? (
            <LeadKanban 
              leads={agentLeads}
              onViewDetails={handleLeadClick}
              onStageChange={handleStageChange}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Este agente aún no tiene leads asignados
            </p>
          )}
        </CardContent>
      </Card>

      <LeadDetailsModal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        lead={selectedLead}
        onOpenSimulators={handleOpenSimulators}
        onOpenRecomendaciones={handleOpenRecomendaciones}
      />

      <SimuladoresModal
        open={simulatorsModalOpen}
        onClose={() => setSimulatorsModalOpen(false)}
        lead={selectedLead}
        onSave={(leadId, updates) => {
          // Implementar se necessário
        }}
      />

      <RecomendacionesModal
        open={recomendacionesModalOpen}
        onClose={() => setRecomendacionesModalOpen(false)}
        lead={selectedLead}
      />
    </div>
  );
}
