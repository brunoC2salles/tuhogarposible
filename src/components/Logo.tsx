import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Si es false, el logo no enlaza al inicio */
  linkToHome?: boolean;
}

const Logo = ({ size = "md", className = "", linkToHome = true }: LogoProps) => {
  const sizeClasses = {
    sm: "h-8 w-auto",
    md: "h-12 w-auto",
    lg: "h-16 w-auto",
  };

  const img = (
    <img
      src={logo}
      alt="Tu hogar posible"
      className={`${sizeClasses[size]} ${className}`}
    />
  );

  if (!linkToHome) return img;

  return (
    <Link to="/" aria-label="Ir al inicio" className="inline-flex hover:opacity-80 transition-opacity">
      {img}
    </Link>
  );
};

export default Logo;
