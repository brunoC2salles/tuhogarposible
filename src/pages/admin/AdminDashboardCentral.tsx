import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  BarChart3,
  Settings,
  FileCheck,
  MapPin,
  Calculator,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

const AdminDashboardCentral = () => {
  const navigate = useNavigate();

  const items = [
    {
      title: 'CRM',
      description: 'Gestión de leads y ventas',
      icon: Users,
      path: '/inventario/admin/crm',
      color: 'text-blue-600',
    },
    {
      title: 'CRM Embargados',
      description: 'Leads del producto Embargados',
      icon: MapPin,
      path: '/crm/embargados',
      color: 'text-orange-600',
    },
    {
      title: 'Analíticos',
      description: 'Tiempo por etapa y proceso completo',
      icon: BarChart3,
      path: '/admin/analiticos',
      color: 'text-purple-600',
    },
    {
      title: 'Verificación de Extractos',
      description: 'Revisión de extractos bancarios',
      icon: FileCheck,
      path: '/admin/verificaciones-extractos',
      color: 'text-amber-600',
    },
    {
      title: 'Simulador Financiero',
      description: 'Crédito personal e hipotecario',
      icon: Calculator,
      path: '/simuladores',
      color: 'text-emerald-600',
    },
    {
      title: 'Settings',
      description: 'Configuración del sistema',
      icon: Settings,
      path: '/admin/settings',
      color: 'text-gray-600',
    },
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground">Tu Hogar Posible</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(item.path)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardCentral;
