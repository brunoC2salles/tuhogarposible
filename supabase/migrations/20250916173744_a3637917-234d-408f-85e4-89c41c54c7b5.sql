-- Criar enum para tipos de imóveis
CREATE TYPE public.tipo_inmueble AS ENUM ('apartamento', 'casa', 'local_comercial', 'terreno', 'oficina');

-- Criar enum para status de reservas
CREATE TYPE public.estado_reserva AS ENUM ('pendiente', 'confirmada', 'cancelada', 'completada');

-- Criar enum para roles de usuário
CREATE TYPE public.user_role AS ENUM ('admin', 'agente');

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  telefono TEXT,
  role user_role NOT NULL DEFAULT 'agente',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de imóveis
CREATE TABLE public.inmuebles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ciudad TEXT NOT NULL,
  region TEXT NOT NULL,
  tipo tipo_inmueble NOT NULL,
  precio DECIMAL(12,2) NOT NULL,
  direccion TEXT NOT NULL,
  proveedor TEXT NOT NULL,
  disponible BOOLEAN NOT NULL DEFAULT true,
  agente_asignado UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de reservas/visitas
CREATE TABLE public.reservas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inmueble_id UUID NOT NULL REFERENCES public.inmuebles(id) ON DELETE CASCADE,
  agente_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fecha_solicitud TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_visita DATE,
  hora_visita TIME,
  estado estado_reserva NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inmuebles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

-- Función para obter o role do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can create profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE 
USING (get_user_role(auth.uid()) = 'admin');

-- Políticas RLS para inmuebles
CREATE POLICY "Everyone can view available inmuebles" 
ON public.inmuebles FOR SELECT 
USING (disponible = true);

CREATE POLICY "Admins can view all inmuebles" 
ON public.inmuebles FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage inmuebles" 
ON public.inmuebles FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Políticas RLS para reservas
CREATE POLICY "Agentes can view their own reservas" 
ON public.reservas FOR SELECT 
USING (auth.uid() = agente_id);

CREATE POLICY "Agentes can create reservas" 
ON public.reservas FOR INSERT 
WITH CHECK (auth.uid() = agente_id);

CREATE POLICY "Admins can view all reservas" 
ON public.reservas FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all reservas" 
ON public.reservas FOR ALL 
USING (get_user_role(auth.uid()) = 'admin');

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    CASE 
      WHEN new.email = 'tuhogarposible.contacto@gmail.com' THEN 'admin'::user_role
      ELSE 'agente'::user_role
    END
  );
  RETURN new;
END;
$$;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inmuebles_updated_at
  BEFORE UPDATE ON public.inmuebles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservas_updated_at
  BEFORE UPDATE ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns dados de exemplo para testes
INSERT INTO public.inmuebles (ciudad, region, tipo, precio, direccion, proveedor) VALUES
('Madrid', 'Madrid', 'apartamento', 350000.00, 'Calle Gran Vía 45, 3º A', 'Inmobiliaria Central'),
('Barcelona', 'Cataluña', 'casa', 450000.00, 'Carrer de Balmes 123', 'Propiedades Barcelona'),
('Valencia', 'Valencia', 'apartamento', 280000.00, 'Avenida del Puerto 67, 2º B', 'Valencia Homes'),
('Sevilla', 'Andalucía', 'local_comercial', 180000.00, 'Plaza Nueva 15', 'Comercial Sur'),
('Bilbao', 'País Vasco', 'oficina', 220000.00, 'Gran Vía Don Diego López de Haro 85', 'Oficinas Norte');