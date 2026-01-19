import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lead, STAGE_LABELS } from '@/types/crm';
import { LeadComments } from './LeadComments';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calculator, Home, User, Building2, FileText, Upload, Download, Trash2, Link2, Plus, ExternalLink, UserCog, Eye, Pencil, MapPin, Bed, Bath, Maximize2, CheckCircle, AlertTriangle } from 'lucide-react';
import { CreateEditLeadModal } from './CreateEditLeadModal';
import { useLeadInmuebles } from '@/hooks/useLeadInmuebles';
import { useLeadDocuments } from '@/hooks/useLeadDocuments';
import { useLeadExternalLinks } from '@/hooks/useLeadExternalLinks';
import { useAuth } from '@/contexts/AuthContext';
import { usePublicContractLinks } from '@/hooks/usePublicContractLinks';
import { toast } from 'sonner';
import { generateLeadCompletePDF } from '@/lib/pdfGeneratorComplete';
import { GenerateContractLinkModal } from '@/components/contratos/GenerateContractLinkModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { DocumentChecklist } from '@/components/crm/DocumentChecklist';
import { useGeneratedContracts } from '@/hooks/useGeneratedContracts';
import { LeadServicesComponent } from '@/components/crm/LeadServices';
import { DocumentPreviewModal } from '@/components/crm/DocumentPreviewModal';
import { FileCheck, ShoppingCart } from 'lucide-react';
import { useAgentes } from '@/hooks/useAgentes';
import { useLeads } from '@/hooks/useLeads';
import { useRecomendaciones } from '@/hooks/useRecomendaciones';

interface LeadDetailsModalProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
  onOpenSimulators: (lead: Lead) => void;
  onOpenRecomendaciones?: (lead: Lead) => void;
}

export const LeadDetailsModal = ({
  open,
  onClose,
  lead,
  onOpenSimulators,
}: LeadDetailsModalProps) => {
  const isMobile = useIsMobile();
  const { user, isAdmin } = useAuth();
  const { agentes } = useAgentes();
  const { reassignLead } = useLeads();
  const { inmuebles, loading: inmueblesLoading, unlinkInmueble, linkInmueble } = useLeadInmuebles(lead?.id);
  const { documents, loading: documentsLoading, uploading, uploadDocument, downloadDocument, deleteDocument, getPreviewUrl } = useLeadDocuments(lead?.id || '');
  const { links: externalLinks, loading: linksLoading, addLink, deleteLink: deleteExternalLink } = useLeadExternalLinks(lead?.id);
  const { links: contractLinks, isLoading: loadingLinks, getPublicLink, deleteLink: deleteContractLink } = usePublicContractLinks(lead?.id);
  const { contracts, getContractUrl } = useGeneratedContracts(lead?.id);
  const { recomendaciones, loading: recomendacionesLoading } = useRecomendaciones({ lead: lead || undefined, enabled: open && !!lead });
  const [contractLinkModalOpen, setContractLinkModalOpen] = useState(false);
  const [showExternalLinkForm, setShowExternalLinkForm] = useState(false);
  const [externalLinkUrl, setExternalLinkUrl] = useState('');
  const [externalLinkTitle, setExternalLinkTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tab control state
  const [activeTab, setActiveTab] = useState('info');
  
  // Mass selection state
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [downloadingMultiple, setDownloadingMultiple] = useState(false);
  
  // Document preview state
  const [previewDocument, setPreviewDocument] = useState<{ name: string; url: string | null } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Edit lead modal state
  const [editLeadModalOpen, setEditLeadModalOpen] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab('info');
      setSelectedDocuments([]);
      setPreviewDocument(null);
    }
  }, [open]);

  const handlePreviewDocument = async (fileName: string) => {
    setLoadingPreview(true);
    const url = await getPreviewUrl(fileName);
    setPreviewDocument({ name: fileName, url });
    setLoadingPreview(false);
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleUnlinkInmueble = async (inmuebleId: string) => {
    if (!lead || !user) return;
    const success = await unlinkInmueble(lead.id, inmuebleId);
    if (success) {
      toast.success('Inmueble desvinculado');
    }
  };

  const handleExportPDF = async () => {
    if (!lead) return;

    try {
      toast.info('Generando PDF completo...');
      await generateLeadCompletePDF(lead);
      toast.success('PDF generado exitosamente');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar PDF');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadDocument(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteDocument = async (fileName: string) => {
    if (window.confirm('¿Estás seguro de eliminar este documento?')) {
      await deleteDocument(fileName);
    }
  };

  const handleAddExternalLink = async () => {
    if (!externalLinkUrl.trim()) {
      toast.error('Por favor ingrese una URL');
      return;
    }

    const success = await addLink(externalLinkUrl, externalLinkTitle || undefined);
    if (success) {
      setExternalLinkUrl('');
      setExternalLinkTitle('');
      setShowExternalLinkForm(false);
    }
  };

  // Mass selection functions
  const toggleDocumentSelection = (docName: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docName) 
        ? prev.filter(name => name !== docName)
        : [...prev, docName]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map(doc => doc.name));
    }
  };

  const downloadSelectedDocuments = async () => {
    if (selectedDocuments.length === 0) {
      toast.error('Seleccione al menos un documento');
      return;
    }
    
    setDownloadingMultiple(true);
    toast.info(`Descargando ${selectedDocuments.length} documentos...`);
    
    for (const docName of selectedDocuments) {
      await downloadDocument(docName);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setSelectedDocuments([]);
    setDownloadingMultiple(false);
    toast.success('Descarga completada');
  };

  const handleDeleteContractLink = async (linkId: string) => {
    if (window.confirm('¿Estás seguro de eliminar este link de contrato?')) {
      deleteContractLink.mutate(linkId);
    }
  };

  if (!lead) return null;

  const modalContent = (
    <>
      <div className="flex items-center justify-between mb-4 px-4 sm:px-0">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge>{STAGE_LABELS[lead.stage]}</Badge>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: es })}
            </span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1 h-auto">
          <TabsTrigger value="info" className="text-xs sm:text-sm">Info</TabsTrigger>
          <TabsTrigger value="simulators" className="text-xs sm:text-sm">Simul.</TabsTrigger>
          <TabsTrigger value="inmuebles" className="text-xs sm:text-sm">Inmuebles ({inmuebles.length})</TabsTrigger>
          <TabsTrigger value="servicios" className="text-xs sm:text-sm">Servicios</TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs sm:text-sm">Docs ({documents.length})</TabsTrigger>
          <TabsTrigger value="comentarios" className="text-xs sm:text-sm">Comentarios</TabsTrigger>
        </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Datos de Contacto
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditLeadModalOpen(true)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{lead.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{lead.telefono}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Preferencias
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditLeadModalOpen(true)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <p className="text-sm text-muted-foreground">Ciudad</p>
                  <p className="font-medium">{lead.ciudad_interes || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Zona</p>
                  <p className="font-medium">{lead.zona_interes || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Valor Deseado</p>
                  <p className="font-medium">{formatCurrency(lead.valor_inmueble_deseado)}</p>
                </div>
              </CardContent>
            </Card>

            {lead.notas && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{lead.notas}</p>
                </CardContent>
              </Card>
            )}

            {/* Admin-only: Agent Assignment */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCog className="h-4 w-4" />
                    Asignar Agente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={lead.agente_asignado_id || ""}
                    onValueChange={async (newAgentId) => {
                      if (newAgentId && newAgentId !== lead.agente_asignado_id) {
                        const success = await reassignLead(lead.id, newAgentId);
                        if (success) {
                          toast.success('Agente reasignado correctamente');
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar agente" />
                    </SelectTrigger>
                    <SelectContent>
                      {agentes.map((agente) => (
                        <SelectItem key={agente.id} value={agente.id}>
                          {agente.nombre} ({agente.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center mt-6">
              <Button onClick={handleExportPDF} size="lg" className="w-full">
                <FileText className="h-5 w-5 mr-2" />
                Exportar Ficha Completa (PDF)
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="simulators" className="space-y-4">
            {/* Alerta de simulação preliminar */}
            {(lead.simulador_personal_data || lead.simulador_hipotecario_data) && lead.source === 'meta_ads' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Simulación Preliminar</span>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  Estos valores son estimaciones basadas en los datos del formulario de Meta Ads. 
                  Se recomienda realizar una simulación completa con datos verificados.
                </p>
              </div>
            )}
            
            <div className="flex gap-2 justify-end mb-4">
              <Button onClick={() => onOpenSimulators(lead)}>
                <Calculator className="h-4 w-4 mr-2" />
                Ejecutar Simuladores
              </Button>
            </div>

            {lead.simulador_personal_data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Crédito Personal</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Monto Solicitado</p>
                    <p className="font-medium">{formatCurrency(lead.simulador_personal_data.montoSolicitado)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cuota Mensual</p>
                    <p className="font-medium">{formatCurrency(lead.simulador_personal_data.cuotaMensual)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plazo</p>
                    <p className="font-medium">{lead.simulador_personal_data.plazoMeses} meses</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tasa de Interés</p>
                    <p className="font-medium">{lead.simulador_personal_data.tasaInteres}%</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {lead.simulador_hipotecario_data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Crédito Hipotecario</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Inmueble</p>
                    <p className="font-medium">{formatCurrency(lead.simulador_hipotecario_data.valorInmueble)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cuota Mensual</p>
                    <p className="font-medium">{formatCurrency(lead.simulador_hipotecario_data.cuotaMensual)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monto Máximo Crédito</p>
                    <p className="font-medium text-primary">{formatCurrency(lead.simulador_hipotecario_data.montoFinanciable)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Capital Propio</p>
                    <p className="font-medium">{formatCurrency(lead.simulador_hipotecario_data.capitalPropioNecesario)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!lead.simulador_personal_data && !lead.simulador_hipotecario_data && (
              <div className="text-center text-muted-foreground py-8">
                No hay datos de simuladores para este lead
              </div>
            )}
          </TabsContent>

          <TabsContent value="inmuebles" className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowExternalLinkForm(!showExternalLinkForm)} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Añadir Enlace Externo
              </Button>
            </div>

            {/* Formulário de Link Externo */}
            {showExternalLinkForm && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6 space-y-3">
                  <div>
                    <Label htmlFor="external-url">URL del Inmueble *</Label>
                    <Input
                      id="external-url"
                      placeholder="https://..."
                      value={externalLinkUrl}
                      onChange={(e) => setExternalLinkUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="external-title">Título (opcional)</Label>
                    <Input
                      id="external-title"
                      placeholder="Ej: Casa en Casafari"
                      value={externalLinkTitle}
                      onChange={(e) => setExternalLinkTitle(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => {
                      setShowExternalLinkForm(false);
                      setExternalLinkUrl('');
                      setExternalLinkTitle('');
                    }}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleAddExternalLink}>
                      Guardar Enlace
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Links Externos */}
            {linksLoading ? (
              <div className="text-center text-muted-foreground py-4">Cargando enlaces...</div>
            ) : externalLinks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Enlaces Externos</h4>
                <div className="grid gap-3">
                  {externalLinks.map((link) => (
                    <Card key={link.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{link.titulo || 'Enlace externo'}</p>
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline truncate block"
                          >
                            <ExternalLink className="h-3 w-3 inline mr-1" />
                            {link.url}
                          </a>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExternalLink(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Inmuebles Vinculados */}
            {inmueblesLoading ? (
              <div className="text-center text-muted-foreground py-8">Cargando...</div>
            ) : inmuebles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Inmuebles Vinculados ({inmuebles.length})
                </h4>
                <div className="grid gap-3">
                  {inmuebles.map((inmueble) => (
                    <Card key={inmueble.id} className="border-green-200 bg-green-50/30">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex gap-3 flex-1 min-w-0">
                          {inmueble.imageUrl && (
                            <img 
                              src={inmueble.imageUrl} 
                              alt={inmueble.titulo || 'Inmueble'} 
                              className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{inmueble.titulo || `${inmueble.tipo} en ${inmueble.ciudad}`}</p>
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {inmueble.direccion}
                            </p>
                            <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(Number(inmueble.precio))}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {inmueble.urlExterna && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(inmueble.urlExterna, '_blank')}
                              title="Ver en web"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlinkInmueble(inmueble.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Recomendaciones basadas en perfil del lead */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Recomendaciones ({recomendaciones.length})
              </h4>
              <p className="text-xs text-muted-foreground">
                Propiedades basadas en la ciudad, zona y valor deseado del lead
              </p>
              
              {recomendacionesLoading ? (
                <div className="text-center text-muted-foreground py-6">Cargando recomendaciones...</div>
              ) : recomendaciones.length === 0 ? (
                <div className="text-center text-muted-foreground py-6 border rounded-md">
                  No hay recomendaciones disponibles para este perfil
                </div>
              ) : (
                <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                  {recomendaciones.map((inmueble) => {
                    const isAlreadyLinked = inmuebles.some(i => i.id === inmueble.id);
                    return (
                      <Card key={inmueble.id} className={isAlreadyLinked ? 'opacity-60' : ''}>
                        <CardContent className="flex items-center gap-3 p-3">
                          {inmueble.imageUrl && (
                            <img 
                              src={inmueble.imageUrl} 
                              alt={inmueble.titulo || 'Inmueble'} 
                              className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{inmueble.titulo || `${inmueble.tipo} en ${inmueble.ciudad}`}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3" />
                              {inmueble.ciudad} - {inmueble.direccion}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              {inmueble.quartos && (
                                <span className="flex items-center gap-1">
                                  <Bed className="h-3 w-3" />
                                  {inmueble.quartos}
                                </span>
                              )}
                              {inmueble.banheiros && (
                                <span className="flex items-center gap-1">
                                  <Bath className="h-3 w-3" />
                                  {inmueble.banheiros}
                                </span>
                              )}
                              {inmueble.areaM2 && (
                                <span className="flex items-center gap-1">
                                  <Maximize2 className="h-3 w-3" />
                                  {inmueble.areaM2}m²
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(Number(inmueble.precio))}</p>
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            {inmueble.urlExterna && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(inmueble.urlExterna, '_blank')}
                                title="Ver detalle"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            {isAlreadyLinked ? (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Vinculado
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={async () => {
                                  if (!lead?.id || !user?.id) return;
                                  const success = await linkInmueble(lead.id, inmueble.id, user.id);
                                  if (success) {
                                    toast.success('Inmueble vinculado');
                                  }
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Vincular
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mensaje cuando no hay nada */}
            {!inmueblesLoading && inmuebles.length === 0 && externalLinks.length === 0 && recomendaciones.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No hay inmuebles vinculados ni recomendaciones para este lead
              </div>
            )}
          </TabsContent>

          <TabsContent value="servicios" className="space-y-4">
            <LeadServicesComponent 
              leadId={lead.id} 
              propertyPrice={inmuebles && inmuebles.length > 0 ? inmuebles[0].precio : 0}
            />
          </TabsContent>

          <TabsContent value="comentarios" className="space-y-4">
            <LeadComments leadId={lead.id} />
          </TabsContent>

          <TabsContent value="documentos" className="space-y-4">
            {/* Checklist de Documentos */}
            <DocumentChecklist leadId={lead.id} />

            {/* Contratos Generados */}
            {contracts && contracts.length > 0 && (
              <div className="space-y-3 mb-6">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Contratos Generados
                </h4>
                {contracts.map((contract) => (
                  <Card key={contract.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {contract.tipo_contrato === 'compra_venta' ? 'Compraventa' : 
                             contract.tipo_contrato === 'alquiler' ? 'Alquiler' : 
                             contract.tipo_contrato === 'reserva' ? 'Reserva' : contract.tipo_contrato}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(contract.generated_at), 'dd MMM yyyy', { locale: es })}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {contract.file_path && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                const url = await getContractUrl(contract.file_path!);
                                window.open(url, '_blank');
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Links de Contratos */}
            {contractLinks && contractLinks.length > 0 && (
              <div className="space-y-3 mb-6">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Links de Contrato Enviados
                </h4>
                {contractLinks.map((link: any) => (
                  <Card key={link.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            Contrato de Mandato
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={
                              link.status === 'pending' ? 'secondary' :
                              link.status === 'completed' ? 'default' : 'destructive'
                            }>
                              {link.status === 'pending' && '⏳ Pendiente'}
                              {link.status === 'completed' && '✅ Completado'}
                              {link.status === 'expired' && '❌ Expirado'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(link.created_at), 'dd MMM yyyy', { locale: es })}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {link.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(getPublicLink(link.token));
                                toast.success('Link copiado al portapapeles');
                              }}
                            >
                              Copiar Link
                            </Button>
                          )}
                          {link.status === 'completed' && link.contract_generated_id && (
                            <Button 
                              size="sm"
                              onClick={async () => {
                                try {
                                  const { data } = await supabase
                                    .from('generated_contracts')
                                    .select('file_path')
                                    .eq('id', link.contract_generated_id)
                                    .single();
                                  
                                  if (data?.file_path) {
                                    const { data: urlData } = await supabase.storage
                                      .from('lead-documents')
                                      .createSignedUrl(data.file_path, 60);
                                    
                                    if (urlData) window.open(urlData.signedUrl, '_blank');
                                  }
                                } catch (err) {
                                  toast.error('Error al descargar PDF');
                                }
                              }}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Descargar PDF
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteContractLink(link.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" onClick={() => setContractLinkModalOpen(true)}>
                <Link2 className="h-4 w-4 mr-2" />
                Generar Link de Contrato
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Subiendo...' : 'Subir Documento'}
              </Button>
            </div>

            {documentsLoading ? (
              <div className="text-center text-muted-foreground py-8">Cargando...</div>
            ) : documents.length > 0 ? (
              <>
                {/* Mass selection header */}
                <div className="flex items-center justify-between mb-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedDocuments.length === documents.length && documents.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedDocuments.length > 0 
                        ? `${selectedDocuments.length} seleccionado(s)` 
                        : 'Seleccionar todos'}
                    </span>
                  </div>
                  {selectedDocuments.length > 0 && (
                    <Button 
                      size="sm" 
                      onClick={downloadSelectedDocuments}
                      disabled={downloadingMultiple}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {downloadingMultiple ? 'Descargando...' : `Descargar (${selectedDocuments.length})`}
                    </Button>
                  )}
                </div>
                
                <div className="grid gap-3">
                  {documents.map((doc) => (
                    <Card key={doc.id} className={selectedDocuments.includes(doc.name) ? 'ring-2 ring-primary' : ''}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedDocuments.includes(doc.name)}
                            onCheckedChange={() => toggleDocumentSelection(doc.name)}
                          />
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(doc.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewDocument(doc.name)}
                            disabled={loadingPreview}
                            title="Ver documento"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocument(doc.name)}
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.name)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                  </Card>
                ))}
              </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No hay documentos subidos para este lead
              </div>
            )}
          </TabsContent>
        </Tabs>
      </>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onClose}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle>{lead.nombre_completo}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto pb-6 px-4">
              {modalContent}
            </div>
          </DrawerContent>
        </Drawer>
        
        {lead && (
          <GenerateContractLinkModal
            open={contractLinkModalOpen}
            onClose={() => setContractLinkModalOpen(false)}
            leadId={lead.id}
            leadName={lead.nombre_completo}
          />
        )}

        <DocumentPreviewModal
          open={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
          fileName={previewDocument?.name || ''}
          fileUrl={previewDocument?.url || null}
          onDownload={() => previewDocument && downloadDocument(previewDocument.name)}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">{lead.nombre_completo}</DialogTitle>
          </DialogHeader>
          {modalContent}
        </DialogContent>
      </Dialog>
      
      {lead && (
        <GenerateContractLinkModal
          open={contractLinkModalOpen}
          onClose={() => setContractLinkModalOpen(false)}
          leadId={lead.id}
          leadName={lead.nombre_completo}
        />
      )}

      <DocumentPreviewModal
        open={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        fileName={previewDocument?.name || ''}
        fileUrl={previewDocument?.url || null}
        onDownload={() => previewDocument && downloadDocument(previewDocument.name)}
      />
      <CreateEditLeadModal
        open={editLeadModalOpen}
        onClose={() => setEditLeadModalOpen(false)}
        lead={lead}
        onSave={async (data) => {
          const { error } = await supabase.from('leads').update({
            nombre_completo: data.nombre_completo,
            telefono: data.telefono,
            email: data.email,
            ciudad_interes: data.ciudad_interes,
            zona_interes: data.zona_interes,
            valor_inmueble_deseado: data.valor_inmueble_deseado,
            notas: data.notas,
          }).eq('id', lead.id);
          
          if (error) {
            toast.error('Error al actualizar lead');
          } else {
            toast.success('Lead actualizado correctamente');
            setEditLeadModalOpen(false);
          }
        }}
      />
    </>
  );
};
