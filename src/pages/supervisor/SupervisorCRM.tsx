import AdminCRM from '@/pages/inventario/AdminCRM';

// Supervisor usa o mesmo CRM do admin (vê todos os leads)
// mas com limitações: não pode deletar ou reasignar leads
const SupervisorCRM = () => {
  return <AdminCRM />;
};

export default SupervisorCRM;