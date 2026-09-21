import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CASTELLON_AGENT_EMAIL, CASTELLON_CRM_PATH } from '@/lib/castellonAgent';

/**
 * Rutas públicas que los agentes no deben usar (simuladores).
 * Visitante sin sesión: acceso normal. Agente con sesión: redirige a su CRM.
 */
const BlockAgenteRoute = ({ children }: { children: ReactNode }) => {
  const { profile, loading } = useAuth();

  if (!loading && profile?.role === 'agente') {
    const to = profile.email === CASTELLON_AGENT_EMAIL ? CASTELLON_CRM_PATH : '/inventario/agente/crm';
    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
};

export default BlockAgenteRoute;
