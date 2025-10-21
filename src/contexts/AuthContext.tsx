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

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 1;

    // ✅ Pure function to load profile - NO side effects here
    const loadProfile = async (userId: string): Promise<Profile | null> => {
      try {
        console.log('[Auth] 🔵 Loading profile for user:', userId);
        
        // ✅ SINGLE QUERY with LEFT JOIN to fetch profile + role
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            *,
            user_roles!left(role)
          `)
          .eq('id', userId)
          .maybeSingle();
        
        if (error) {
          console.error('[Auth] ❌ Error fetching profile:', error);
          throw error;
        }
        
        if (!data) {
          console.warn('[Auth] ⚠️ No profile found for user:', userId);
          return null;
        }

        // ✅ Extract role from join (handle array format)
        const roleData = Array.isArray(data.user_roles) ? data.user_roles[0] : data.user_roles;
        const role = roleData?.role || 'agente';
        
        const fullProfile = {
          ...data,
          role
        } as Profile;
        
        console.log('[Auth] ✅ Profile loaded:', fullProfile.nombre, 'Role:', fullProfile.role);
        return fullProfile;
      } catch (error) {
        console.error('[Auth] ❌ Profile fetch exception:', error);
        
        // ✅ Retry logic - try once more
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log('[Auth] 🔄 Retrying profile fetch, attempt:', retryCount);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return loadProfile(userId);
        }
        
        toast.error('Error al cargar el perfil de usuario');
        return null;
      }
    };

    // ✅ Setup listener FIRST (best practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('[Auth] 🟡 Auth state change:', event);
        
        // ✅ Update session/user SYNCHRONOUSLY (no async!)
        setSession(session);
        setUser(session?.user ?? null);
        
        // ✅ Defer profile loading with setTimeout(0) to avoid blocking
        if (session?.user) {
          setTimeout(async () => {
            if (!mounted) return;
            const profile = await loadProfile(session.user.id);
            if (mounted) {
              setProfile(profile);
              setLoading(false);
            }
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // ✅ THEN get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      
      console.log('[Auth] 🟢 Get session result:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const profile = await loadProfile(session.user.id);
        if (mounted) setProfile(profile);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // ✅ No dependencies - runs only once

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