import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Rutas públicas que los agentes no deben usar (simuladores).
 * Visitante sin sesión: acceso normal. Agente con sesión: redirige a su CRM.
 */
const BlockAgenteRoute = ({ children }: { children: ReactNode }) => {
  const { profile, loading } = useAuth();

  if (!loading && profile?.role === 'agente') {
    return <Navigate to="/inventario/agente/crm" replace />;
  }

  return <>{children}</>;
};

export default BlockAgenteRoute;
