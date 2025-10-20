import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Profile {
  id: string;
  email: string;
  nombre: string;
  telefono?: string;
  role: 'admin' | 'agente';
  activo: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nombre: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isAgente: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Helper function to load profile
    const loadProfile = async (userId: string) => {
      console.log('[Auth] 🔵 Loading profile for user:', userId);
      
      // Wait to ensure auth context is established
      await new Promise(resolve => setTimeout(resolve, 50));
      
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error('[Auth] ❌ Error fetching profile:', error);
          console.error('[Auth] ❌ Error details:', JSON.stringify(error));
          toast.error('Error al cargar el perfil de usuario');
          setProfile(null);
        } else {
          console.log('[Auth] ✅ Profile loaded:', profileData?.nombre);
          setProfile(profileData);
        }
      } catch (error) {
        console.error('[Auth] ❌ Profile fetch exception:', error);
        setProfile(null);
      }
    };

    // 1. First, check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[Auth] 🟢 Get session result:', !!session);
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadProfile(session.user.id);
      }
      
      setLoading(false);
      setInitialized(true);
    });

    // 2. Then, set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] 🟡 Auth state change:', event);
        if (!mounted) return;
        
        // Ignore redundant events during initialization
        if (!initialized && event === 'INITIAL_SESSION') return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        if (initialized) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initialized]);

  // Safety timeout - force loading to false after 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('[Auth] ⏰ Loading timeout - forcing false');
        setLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [loading]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string, nombre: string) => {
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nombre: nombre
        }
      }
    });
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    
    // ✅ FASE 5: Limpar cache antes de logout
    try {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    } catch (err) {
      console.error('[Auth] Error clearing cache:', err);
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
  };

  const isAdmin = profile?.role === 'admin';
  const isAgente = profile?.role === 'agente';

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isAgente,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};