import { useAuth } from '@/contexts/AuthContext';
import AdminCRM from '@/pages/inventario/AdminCRM';
import AgenteCRM from '@/pages/inventario/AgenteCRM';

/**
 * CRM Castellón — kanban exclusivo para leads de la provincia de Castellón.
 * Admin/supervisor ven la vista completa; el agente responsable ve solo sus leads.
 */
const CastellonCRM = () => {
  const { isAdmin, isSupervisor } = useAuth();

  if (isAdmin || isSupervisor) {
    return (
      <AdminCRM
        scope="castellon"
        title="CRM Castellón"
        subtitle="Leads de la provincia de Castellón"
      />
    );
  }

  return <AgenteCRM scope="castellon" title="CRM Castellón" />;
};

export default CastellonCRM;
