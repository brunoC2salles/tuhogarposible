import { LogIn, LogOut, User, CalendarDays, Users, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

interface AuthButtonProps {
  className?: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
}

const AuthButton = ({ className = "", size = "sm", variant = "outline" }: AuthButtonProps) => {
  const { user, profile, signOut, loading, isAdmin, isSupervisor } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!user) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => navigate("/auth")}
        disabled={loading}
        className={className}
      >
        <LogIn className="w-4 h-4 mr-2" />
        Iniciar Sesión
      </Button>
    );
  }

  const crmPath = isAdmin
    ? "/inventario/admin/crm"
    : isSupervisor
    ? "/supervisor/crm"
    : "/inventario/agente/crm";
  const visitasPath = isAdmin || isSupervisor ? "/admin/visitas" : "/agente/visitas";

  const initial = (profile?.nombre || user.email || "U").charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`rounded-full ${className}`} aria-label="Mi perfil">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary">{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 bg-popover z-50">
        <DropdownMenuLabel className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{profile?.nombre || "Mi cuenta"}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/agente/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Mi perfil y disponibilidad
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(visitasPath)}>
          <CalendarDays className="mr-2 h-4 w-4" />
          Mis visitas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(crmPath)}>
          <Users className="mr-2 h-4 w-4" />
          Mis leads (CRM)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AuthButton;
