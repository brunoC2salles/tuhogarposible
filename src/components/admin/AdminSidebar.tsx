import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Home,
  Users,
  BarChart3,
  GraduationCap,
  DollarSign,
  Settings,
  FileCheck,
} from 'lucide-react';

const menuItems = [
  {
    group: 'Gestión',
    items: [
      { title: 'Página Inicial', url: '/', icon: Home },
      { title: 'CRM', url: '/inventario/admin/crm', icon: Users },
      { title: 'Dashboard Analítico', url: '/admin/dashboard', icon: BarChart3 },
    ],
  },
  {
    group: 'Equipo',
    items: [
      { title: 'Agentes', url: '/admin/agentes', icon: Users },
    ],
  },
  {
    group: 'Operacional',
    items: [
      { title: 'Verificación de Extractos', url: '/admin/verificaciones-extractos', icon: FileCheck },
      { title: 'Academia', url: '/academia', icon: GraduationCap },
    ],
  },
  {
    group: 'Financiero',
    items: [
      { title: 'Control Financiero', url: '/financiero', icon: DollarSign },
    ],
  },
  {
    group: 'Configuración',
    items: [
      { title: 'Settings', url: '/admin/settings', icon: Settings },
    ],
  },
];

export const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { open: sidebarOpen } = useSidebar();

  const isActive = (url: string) => {
    return location.pathname === url;
  };

  const handleNavigation = (item: any) => {
    if (item.external) {
      window.open(item.url, '_blank');
    } else {
      navigate(item.url);
    }
  };

  return (
    <Sidebar collapsible="icon" className={sidebarOpen ? 'w-64' : 'w-14'}>
      <SidebarContent>
        {menuItems.map((section) => (
          <SidebarGroup key={section.group}>
            <SidebarGroupLabel>{section.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item)}
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
};
