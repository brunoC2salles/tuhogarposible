import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import Logo from '@/components/Logo';
import { 
  Menu, 
  Users, 
  BarChart3, 
  Building, 
  GraduationCap, 
  DollarSign, 
  Settings, 
  FileText, 
  UserPlus, 
  PhoneOff, 
  MessageSquare,
  LogOut,
  Home
} from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

const AdminHeader = ({ title, subtitle }: AdminHeaderProps) => {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="border-b bg-card sticky top-0 z-10">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Logo e Título */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <Logo size="sm" className="flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2">
            <NotificationBell />

            {/* Menu Hamburguer */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Navegación</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard Principal
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Gestión</DropdownMenuLabel>
                
                <DropdownMenuItem onClick={() => navigate('/inventario/admin/crm')}>
                  <Users className="h-4 w-4 mr-2" />
                  CRM
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => navigate('/admin/dashboard')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard Analítico
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Equipo</DropdownMenuLabel>
                
                <DropdownMenuItem onClick={() => navigate('/admin/agentes')}>
                  <Users className="h-4 w-4 mr-2" />
                  Agentes
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => navigate('/admin/reclutamiento')}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Reclutamiento
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Operacional</DropdownMenuLabel>
                
                <DropdownMenuItem onClick={() => navigate('/inventario/admin')}>
                  <Building className="h-4 w-4 mr-2" />
                  Inventario
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => navigate('/academia')}>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Academia
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Financiero</DropdownMenuLabel>
                
                <DropdownMenuItem onClick={() => navigate('/financeiro')}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Control Financiero
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Configuración</DropdownMenuLabel>
                
                <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => navigate('/admin/contract-templates')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Templates
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Recuperación</DropdownMenuLabel>
                
                <DropdownMenuItem onClick={() => navigate('/admin/abandonos')}>
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Abandonos
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">Comunicación</DropdownMenuLabel>
                
                <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Slack
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Avatar e Perfil */}
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {profile?.nombre?.charAt(0).toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{profile?.nombre}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {/* Botão Logout */}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden sm:flex">
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;