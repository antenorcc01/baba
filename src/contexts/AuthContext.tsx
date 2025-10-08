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
  total_goals: number;
  baba_id: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSuspended: boolean;
  loading: boolean;
  gameTermSingular: string;
  gameTermPlural: string;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  isSuspended: false,
  loading: true,
  gameTermSingular: "Baba",
  gameTermPlural: "Babas",
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameTermSingular, setGameTermSingular] = useState("Baba");
  const [gameTermPlural, setGameTermPlural] = useState("Babas");
  const initialLoadCompleted = useRef(false);

  const getProfileAndSetStates = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setIsAdmin(false);
      setIsSuspended(false);
      setGameTermSingular("Baba");
      setGameTermPlural("Babas");
      return;
    }

    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching profile:", error);
        throw error;
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

        // Fetch game terms
        if (userProfile.baba_id) {
          const { data: settings, error: settingsError } = await supabase
            .from('group_settings')
            .select('setting_key, setting_value')
            .in('setting_key', ['game_term_singular', 'game_term_plural'])
            .eq('baba_id', userProfile.baba_id);
          
          if (settingsError) console.error("Error fetching game terms:", settingsError);

          const terms = settings?.reduce((acc, setting) => {
            acc[setting.setting_key] = setting.setting_value;
            return acc;
          }, {} as Record<string, string>) || {};

          setGameTermSingular(terms['game_term_singular'] || "Baba");
          setGameTermPlural(terms['game_term_plural'] || "Babas");
        }

      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsSuspended(false);
        setGameTermSingular("Baba");
        setGameTermPlural("Babas");
      }
    } catch (err) {
      console.error("Error in getProfileAndSetStates:", err);
      setProfile(null);
      setIsAdmin(false);
      setIsSuspended(false);
      setGameTermSingular("Baba");
      setGameTermPlural("Babas");
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

      if (!initialLoadCompleted.current) {
        setLoading(false);
        initialLoadCompleted.current = true;
      }
      
      if (_event === 'SIGNED_IN') {
        showSuccess("Login realizado com sucesso!");
      }
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (isMounted) {
        handleAuthEvent('INITIAL_LOAD', initialSession);
      }
    }).catch(error => {
      console.error("Error fetching initial session:", error);
      if (isMounted && !initialLoadCompleted.current) {
        setLoading(false);
        initialLoadCompleted.current = true;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isMounted) {
        handleAuthEvent(event, session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    profile,
    isAdmin,
    isSuspended,
    loading,
    gameTermSingular,
    gameTermPlural,
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