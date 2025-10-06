"use client";

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { showSuccess } from '@/utils/toast';

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  player_type: string | null;
  profile_picture_url: string | null;
  role: string;
  payment_status: string;
  is_mensalista: boolean;
  is_deleted: boolean;
  is_suspended: boolean;
  suspension_end_date: string | null;
  instagram: string | null;
  titles: number;
  skill_level: number;
  total_goals: number; // Novo campo
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSuspended: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isSuspended: false,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialLoadCompleted = useRef(false); // Usar um ref para controlar o carregamento inicial

  const getProfileAndSetStates = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setIsAdmin(false);
      setIsSuspended(false);
      return;
    }

    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, player_type, profile_picture_url, role, payment_status, is_mensalista, is_deleted, is_suspended, suspension_end_date, instagram, titles, skill_level, total_goals') // Incluir total_goals
        .eq('id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error("Error fetching profile:", error);
        setProfile(null);
        setIsAdmin(false);
        setIsSuspended(false);
        return;
      }

      if (userProfile) {
        setProfile(userProfile as Profile);
        setIsAdmin(userProfile.role === 'admin');
        
        let suspensionStatus = userProfile.is_suspended;
        if (suspensionStatus && userProfile.suspension_end_date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const endDate = new Date(userProfile.suspension_end_date + 'T00:00:00');
          if (today > endDate) {
            suspensionStatus = false;
            // Fire and forget update to clear suspension status in DB
            supabase.from('profiles').update({ 
              is_suspended: false, 
              suspension_reason: null, 
              suspension_end_date: null 
            }).eq('id', currentUser.id).then(({ error: updateError }) => {
              if (updateError) console.error("Error clearing expired suspension:", updateError);
            });
          }
        }
        setIsSuspended(suspensionStatus);
      } else {
        // User exists but no profile found (e.g., new user, profile not created yet by trigger)
        setProfile(null);
        setIsAdmin(false);
        setIsSuspended(false);
      }
    } catch (err) {
      console.error("Error in getProfileAndSetStates:", err);
      setProfile(null);
      setIsAdmin(false);
      setIsSuspended(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const handleAuthEvent = async (_event: string, currentSession: Session | null) => {
      if (!isMounted) return;

      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      await getProfileAndSetStates(currentUser);

      // Garante que o loading seja definido como false apenas uma vez após o carregamento inicial
      if (!initialLoadCompleted.current) {
        setLoading(false);
        initialLoadCompleted.current = true;
      }
      
      if (_event === 'SIGNED_IN') {
        showSuccess("Login realizado com sucesso!");
      }
    };

    // Tenta obter a sessão inicial diretamente
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (isMounted) {
        handleAuthEvent('INITIAL_LOAD', initialSession);
      }
    }).catch(error => {
      console.error("Error fetching initial session:", error);
      if (isMounted && !initialLoadCompleted.current) {
        setLoading(false); // Garante que o loading seja false mesmo em caso de erro inicial
        initialLoadCompleted.current = true;
      }
    });

    // Configura o listener para mudanças futuras no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isMounted) {
        handleAuthEvent(event, session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Array de dependências vazio para rodar apenas uma vez na montagem

  const value = {
    session,
    user,
    profile,
    isAdmin,
    isSuspended,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};