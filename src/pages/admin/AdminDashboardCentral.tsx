import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
import Logo from '@/components/Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const AdminDashboardCentral = () => {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <div>
                <h1 className="text-2xl font-bold">Panel de Administración</h1>
                <p className="text-sm text-muted-foreground">Tu Hogar Posible</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <NotificationBell />
              
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {profile?.nombre?.charAt(0).toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{profile?.nombre}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {dashboardSections.map((section) => (
            <div key={section.category}>
              <h2 className="text-xl font-semibold mb-4 text-muted-foreground">
                {section.category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card 
                      key={item.title}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => item.onClick ? item.onClick() : navigate(item.path)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{item.title}</CardTitle>
                            <CardDescription className="text-xs">
                              {item.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardCentral;