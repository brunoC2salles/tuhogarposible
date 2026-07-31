import { LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface AuthButtonProps {
  className?: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "default";
}

const AuthButton = ({ className = "", size = "sm", variant = "outline" }: AuthButtonProps) => {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const handleClick = async () => {
    if (user) {
      await signOut();
      navigate("/auth");
    } else {
      navigate("/auth");
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleClick} disabled={loading} className={className}>
      {user ? (
        <>
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </>
      ) : (
        <>
          <LogIn className="w-4 h-4 mr-2" />
          Iniciar Sesión
        </>
      )}
    </Button>
  );
};

export default AuthButton;
