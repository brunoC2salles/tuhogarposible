import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  BarChart3, 
  Building, 
  GraduationCap, 
  DollarSign, 
  Settings, 
  FileText, 
  UserPlus,
  PhoneOff,
  MessageSquare
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';

const AdminDashboardCentral = () => {
  const navigate = useNavigate();

  const dashboardSections = [
    {
      category: 'Gestión',
      items: [
        { 
          title: 'CRM', 
          description: 'Gestión de leads y ventas',
          icon: Users,
          path: '/inventario/admin/crm',
          color: 'text-blue-600'
        },
        { 
          title: 'Dashboard Analítico', 
          description: 'Métricas y estadísticas',
          icon: BarChart3,
          path: '/admin/dashboard',
          color: 'text-purple-600'
        }
      ]
    },
    {
      category: 'Equipo',
      items: [
        { 
          title: 'Agentes', 
          description: 'Gestión de agentes',
          icon: Users,
          path: '/admin/agentes',
          color: 'text-green-600'
        },
        { 
          title: 'Reclutamiento', 
          description: 'Candidatos a agentes',
          icon: UserPlus,
          path: '/admin/reclutamiento',
          color: 'text-teal-600'
        }
      ]
    },
    {
      category: 'Operacional',
      items: [
        { 
          title: 'Inventario', 
          description: 'Propiedades disponibles',
          icon: Building,
          path: '/inventario/admin',
          color: 'text-orange-600'
        },
        { 
          title: 'Academia', 
          description: 'Capacitación del equipo',
          icon: GraduationCap,
          path: '/academia',
          color: 'text-indigo-600'
        }
      ]
    },
    {
      category: 'Financiero',
      items: [
        { 
          title: 'Control Financiero', 
          description: 'Facturación y gastos',
          icon: DollarSign,
          path: '/financeiro',
          color: 'text-emerald-600'
        }
      ]
    },
    {
      category: 'Configuración',
      items: [
        { 
          title: 'Settings', 
          description: 'Configuración del sistema',
          icon: Settings,
          path: '/admin/settings',
          color: 'text-gray-600'
        },
        { 
          title: 'Templates', 
          description: 'Plantillas de contratos',
          icon: FileText,
          path: '/admin/contract-templates',
          color: 'text-slate-600'
        }
      ]
    },
    {
      category: 'Recuperación',
      items: [
        { 
          title: 'Abandonos', 
          description: 'Formularios abandonados',
          icon: PhoneOff,
          path: '/admin/abandonos',
          color: 'text-red-600'
        }
      ]
    },
    {
      category: 'Comunicación',
      items: [
        { 
          title: 'Slack', 
          description: 'Chat del equipo',
          icon: MessageSquare,
          path: '#',
          color: 'text-purple-600',
          onClick: () => {
            // Será implementado en Fase 4
            navigate('/admin/settings');
          }
        }
      ]
    }
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 max-h-[90vh] overflow-y-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground">Tu Hogar Posible</p>
        </div>
        
        {/* Grid único compacto con 4 colunas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dashboardSections.flatMap(section => 
            section.items.map((item) => {
              const Icon = item.icon;
              return (
                <Card 
                  key={item.title}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => item.onClick ? item.onClick() : navigate(item.path)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
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
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardCentral;