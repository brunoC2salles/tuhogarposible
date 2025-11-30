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
  Building,
  GraduationCap,
  DollarSign,
  Settings,
  FileText,
  UserPlus,
  PhoneOff,
  MessageSquare,
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
      { title: 'Reclutamiento', url: '/admin/reclutamiento', icon: UserPlus },
    ],
  },
  {
    group: 'Operacional',
    items: [
      { title: 'Inventario', url: '/inventario/admin', icon: Building },
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
      { title: 'Templates', url: '/admin/contract-templates', icon: FileText },
    ],
  },
  {
    group: 'Recuperación',
    items: [
      { title: 'Abandonos', url: '/admin/abandonos', icon: PhoneOff },
    ],
  },
  {
    group: 'Comunicación',
    items: [
      {
        title: 'Slack',
        url: 'https://app.slack.com/client/T0A0EQF2XNF',
        icon: MessageSquare,
        external: true,
      },
    ],
  },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();

  const isActive = (url: string) => {
    if (url === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(url);
  };

  const handleNavigation = (item: any) => {
    if (item.external) {
      window.open(item.url, '_blank');
    } else {
      navigate(item.url);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Menu Groups */}
        {menuItems.map((section) => (
          <SidebarGroup key={section.group}>
            <SidebarGroupLabel>{section.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item)}
                      isActive={!item.external && isActive(item.url)}
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
}
