import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import Logo from "@/components/Logo";
const Auth = () => {
  const {
    user,
    signIn,
    signUp,
    loading
  } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    nombre: '',
    confirmPassword: ''
  });

  // If user is already logged in, redirect to home
  if (user) {
    return <Navigate to="/" replace />;
  }
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const {
        error
      } = await signIn(loginForm.email, loginForm.password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Credenciales incorrectas', {
            description: 'Verifica tu email y contraseña'
          });
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Email no confirmado', {
            description: 'Por favor confirma tu email antes de iniciar sesión'
          });
        } else {
          toast.error('Error al iniciar sesión', {
            description: error.message
          });
        }
      } else {
        toast.success('Bienvenido de vuelta');
      }
    } catch (error) {
      toast.error('Error inesperado al iniciar sesión');
      console.error('[Auth] Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (registerForm.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setIsSubmitting(true);
    try {
      const {
        error
      } = await signUp(registerForm.email, registerForm.password, registerForm.nombre);
      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('Usuario ya registrado', {
            description: 'Ya existe una cuenta con este email'
          });
        } else {
          toast.error('Error al crear la cuenta', {
            description: error.message
          });
        }
      } else {
        toast.success('Cuenta creada exitosamente', {
          description: 'Revisa tu email para confirmar la cuenta'
        });
        // Clear form
        setRegisterForm({
          email: '',
          password: '',
          nombre: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      toast.error('Error inesperado al crear la cuenta');
      console.error('[Auth] Register error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return <div className="min-h-screen bg-gradient-to-br from-sky-blue-light to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 text-primary hover:text-primary/80 transition-colors">
            <Logo size="md" />
            <div className="text-left">
              <h1 className="text-2xl font-bold">Tu Hogar Posible</h1>
              <p className="text-sm text-muted-foreground">Portal de Inventario</p>
            </div>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Acceder al Sistema</CardTitle>
            <CardDescription>
              Inicia sesión o crea tu cuenta para acceder al inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Registrarse
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={loginForm.email} onChange={e => setLoginForm(prev => ({
                    ...prev,
                    email: e.target.value
                  }))} placeholder="tu@email.com" required disabled={loading || isSubmitting} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input id="password" type="password" value={loginForm.password} onChange={e => setLoginForm(prev => ({
                    ...prev,
                    password: e.target.value
                  }))} placeholder="••••••••" required disabled={loading || isSubmitting} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || isSubmitting}>
                    {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>
                </form>

                <div className="mt-4 space-y-3">
                  
                  
                  
                </div>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-nombre">Nombre completo</Label>
                    <Input id="register-nombre" type="text" value={registerForm.nombre} onChange={e => setRegisterForm(prev => ({
                    ...prev,
                    nombre: e.target.value
                  }))} placeholder="Tu nombre completo" required disabled={loading || isSubmitting} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input id="register-email" type="email" value={registerForm.email} onChange={e => setRegisterForm(prev => ({
                    ...prev,
                    email: e.target.value
                  }))} placeholder="tu@email.com" required disabled={loading || isSubmitting} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Contraseña</Label>
                    <Input id="register-password" type="password" value={registerForm.password} onChange={e => setRegisterForm(prev => ({
                    ...prev,
                    password: e.target.value
                  }))} placeholder="••••••••" required minLength={6} disabled={loading || isSubmitting} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">Confirmar contraseña</Label>
                    <Input id="register-confirm" type="password" value={registerForm.confirmPassword} onChange={e => setRegisterForm(prev => ({
                    ...prev,
                    confirmPassword: e.target.value
                  }))} placeholder="••••••••" required disabled={loading || isSubmitting} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || isSubmitting}>
                    {isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>;
};
export default Auth;