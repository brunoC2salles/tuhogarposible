import { format } from 'date-fns';
import { Lead } from '@/types/crm';

interface CSVExportData {
  id: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  edad: number;
  ciudad_interes?: string;
  comunidad_autonoma?: string;
  valor_inmueble_deseado?: number;
  entrada_disponible?: number;
  ingresos_mensuales: number;
  situacion_laboral?: string;
  deudas_actuales?: number;
  en_fichero_morosidad: boolean;
  compra_solo_acompanado?: string;
  acompanante_nombre?: string;
  acompanante_relacion?: string;
  acompanante_aporte?: number;
  qualificado: boolean;
  razon_no_qualificado?: string;
  agente_asignado_id?: string;
  simulador_personal_data?: any;
  simulador_hipotecario_data?: any;
  created_at: string;
}

/**
 * Formata data no formato DD/MM/YYYY
 */
function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch {
    return dateString;
  }
}

/**
 * Escapa valores CSV (aspas duplas e quebras de linha)
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exporta leads do CRM (tipo Lead) para CSV
 * Aceita tanto dados do formulário quanto dados do webhook Meta Ads
 */
export function exportLeadsToCSV(leads: Lead[], agenteNomes: Record<string, string> = {}): string {
  // Header simplificado para leads do CRM
  const headers = [
    'ID',
    'Nombre Completo',
    'Email',
    'Teléfono',
    'Ciudad Interés',
    'Zona Interés',
    'Valor Inmueble Deseado (€)',
    'Stage',
    'Fuente',
    'Agente Asignado',
    'Crédito Personal Máximo (€)',
    'Cuota Personal (€)',
    'Hipoteca Máxima (€)',
    'Cuota Hipoteca (€)',
    'Notas',
    'Fecha Creación',
    'Última Actualización',
  ];

  const rows = leads.map(lead => {
    // Suporta ambos formatos de dados de simulação (formulário e webhook)
    const simPersonal = lead.simulador_personal_data as any;
    const simHipo = lead.simulador_hipotecario_data as any;
    
    return [
      escapeCSV(lead.id),
      escapeCSV(lead.nombre_completo),
      escapeCSV(lead.email),
      escapeCSV(lead.telefono),
      escapeCSV(lead.ciudad_interes || ''),
      escapeCSV(lead.zona_interes || ''),
      escapeCSV(lead.valor_inmueble_deseado || ''),
      escapeCSV(lead.stage),
      escapeCSV(lead.source),
      escapeCSV(agenteNomes[lead.agente_asignado_id || ''] || lead.agente_nombre || lead.agente_asignado_id || ''),
      escapeCSV(simPersonal?.monto_maximo || simPersonal?.montoAprobado || simPersonal?.montoSolicitado || ''),
      escapeCSV(simPersonal?.cuota_mensual || simPersonal?.cuotaMensual || ''),
      escapeCSV(simHipo?.monto_maximo_financiable || simHipo?.montoFinanciable || ''),
      escapeCSV(simHipo?.cuota_maxima_mensual || simHipo?.cuotaMensual || ''),
      escapeCSV(lead.notas || ''),
      formatDate(lead.created_at),
      formatDate(lead.updated_at),
    ];
  });

  // Gerar CSV com BOM para UTF-8 (para Excel/Google Sheets)
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  
  return csvContent;
}

/**
 * Exporta dados completos do formulário de qualificação para CSV
 */
export function exportFormSubmissionsToCSV(leads: CSVExportData[], agenteNomes: Record<string, string> = {}): string {
  // Header
  const headers = [
    'ID',
    'Nome Completo',
    'Email',
    'Telefone',
    'Idade',
    'Cidade',
    'Comunidade',
    'Valor Imóvel',
    'Entrada Disponível',
    'Rendimentos Mensais',
    'Situação Laboral',
    'Dívidas Atuais',
    'Em Ficheiro Morosidade',
    'Compra Solo/Acompanhado',
    'Nome Acompanhante',
    'Relação Acompanhante',
    'Aporte Acompanhante',
    'Qualificado',
    'Razão Não Qualificado',
    'Agente Atribuído',
    'Cuota Mensual Personal (€)',
    'Cuota Mensual Hipoteca (€)',
    'Monto Máximo Crédito Personal (€)',
    'Monto Máximo Hipoteca (€)',
    'Data Criação',
  ];

  const rows = leads.map(lead => [
    escapeCSV(lead.id),
    escapeCSV(lead.nombre_completo),
    escapeCSV(lead.email),
    escapeCSV(lead.telefono),
    escapeCSV(lead.edad),
    escapeCSV(lead.ciudad_interes || ''),
    escapeCSV(lead.comunidad_autonoma || ''),
    escapeCSV(lead.valor_inmueble_deseado || ''),
    escapeCSV(lead.entrada_disponible || 0),
    escapeCSV(lead.ingresos_mensuales),
    escapeCSV(lead.situacion_laboral || ''),
    escapeCSV(lead.deudas_actuales || 0),
    escapeCSV(lead.en_fichero_morosidad ? 'Sí' : 'No'),
    escapeCSV(lead.compra_solo_acompanado || ''),
    escapeCSV(lead.acompanante_nombre || ''),
    escapeCSV(lead.acompanante_relacion || ''),
    escapeCSV(lead.acompanante_aporte || ''),
    escapeCSV(lead.qualificado ? 'Sí' : 'No'),
    escapeCSV(lead.razon_no_qualificado || ''),
    escapeCSV(agenteNomes[lead.agente_asignado_id || ''] || lead.agente_asignado_id || ''),
    escapeCSV(lead.simulador_personal_data?.cuotaMensual?.toFixed(2) || ''),
    escapeCSV(lead.simulador_hipotecario_data?.cuotaMensual?.toFixed(2) || ''),
    escapeCSV(lead.simulador_personal_data?.montoAprobado?.toFixed(2) || ''),
    escapeCSV(lead.simulador_hipotecario_data?.montoFinanciado?.toFixed(2) || ''),
    formatDate(lead.created_at),
  ]);

  // Gerar CSV com BOM para UTF-8 (para Excel/Google Sheets)
  const BOM = '\uFEFF';
  const csvContent = BOM + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  
  return csvContent;
}

/**
 * Faz download do CSV no navegador
 */
export function downloadCSV(csvContent: string, filename?: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `leads_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
