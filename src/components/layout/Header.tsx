"use client";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { LogOutIcon, MenuIcon, UserIcon, Shield, Users, DollarSign, ScrollText, Calendar, MapPinIcon, Home, TrophyIcon, MessageCircle, LogInIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess } from "@/utils/toast";
import { ModeToggle } from "@/components/ModeToggle";
import { useState, useEffect } from "react";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`text-sm font-medium transition-colors hover:text-primary-foreground/80 ${
        isActive ? "text-primary-foreground" : "text-primary-foreground/60"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ to, children, Icon }: { to: string; children: React.ReactNode; Icon: React.ElementType }) {
    const location = useLocation();
    const isActive = location.pathname === to;
  
    return (
      <SheetClose asChild>
        <Link
          to={to}
          className={`flex items-center gap-4 px-2.5 py-2 rounded-md transition-colors ${
            isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="h-5 w-5" />
          {children}
        </Link>
      </SheetClose>
    );
  }

export default function Header() {
  const { session, profile, isAdmin, loading: authLoading, gameTermPlural } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [babaName, setBabaName] = useState<string | null>(null);
  const [babaLogoUrl, setBabaLogoUrl] = useState<string>("/favicon.png");

  const isAuthPage = location.pathname === '/auth';
  const isWelcomePage = location.pathname === '/';
  const isAdministerBabaPage = location.pathname === '/administer-baba';
  const isJoinBabaPage = location.pathname === '/join-baba';

  const showAuthButtons = !session && (isWelcomePage || isAuthPage || isAdministerBabaPage || isJoinBabaPage);
  const showNavAndProfile = session && !authLoading && profile?.baba_id;

  useEffect(() => {
    const fetchSettings = async () => {
      if (!profile?.baba_id) return;

      const { data, error } = await supabase
        .from('group_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['whatsapp_group_link', 'baba_name', 'baba_logo_url'])
        .eq('baba_id', profile.baba_id);

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching settings in Header:", error);
        setWhatsappLink(null);
        setBabaName(null);
        setBabaLogoUrl("/favicon.png");
      } else if (data) {
        const settingsMap = data.reduce((acc, setting) => {
          acc[setting.setting_key] = setting.setting_value;
          return acc;
        }, {} as Record<string, string>);
        setWhatsappLink(settingsMap['whatsapp_group_link'] || null);
        setBabaName(settingsMap['baba_name'] || null);
        setBabaLogoUrl(settingsMap['baba_logo_url'] || "/favicon.png");
      } else {
        setWhatsappLink(null);
        setBabaName(null);
        setBabaLogoUrl("/favicon.png");
      }
    };

    if (showNavAndProfile) {
      fetchSettings();
    } else {
      setWhatsappLink(null);
      setBabaName(null);
      setBabaLogoUrl("/favicon.png");
    }
  }, [showNavAndProfile, profile?.baba_id]);

  useEffect(() => {
    document.title = babaName ? `${babaName} - Futebol dos Amigos` : 'Futebol dos Amigos';
  }, [babaName]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      showSuccess("Logout realizado com sucesso!");
      navigate('/', { replace: true });
      
    } catch (error: any) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handleOpenWhatsappGroup = () => {
    if (whatsappLink) {
      window.open(whatsappLink, '_blank');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", Icon: Home },
    { path: "/babas", label: gameTermPlural, Icon: Calendar },
    { path: "/torneios", label: "Torneios", Icon: TrophyIcon },
    { path: "/arenas", label: "Arenas", Icon: MapPinIcon },
    { path: "/jogadores", label: "Jogadores", Icon: Users },
    { path: "/meus-pagamentos", label: "Financeiro", Icon: DollarSign },
    { path: "/regulamento", label: "Regulamento", Icon: ScrollText },
  ];

  if (isAdmin) {
    navItems.push({ path: "/administracao", label: "Admin", Icon: Shield });
  }

  return (
    <header className="bg-primary shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={session && profile?.baba_id ? "/dashboard" : "/"} className="flex items-center gap-2">
          <img src={babaLogoUrl} alt="Logo" className="h-12 w-12 object-contain" />
          <span className="text-2xl font-bold text-primary-foreground">{babaName || "Futebol dos Amigos"}</span>
        </Link>

        {showNavAndProfile && (
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <ModeToggle />
          {showNavAndProfile ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.profile_picture_url || ""} alt={profile?.full_name || "Avatar"} />
                      <AvatarFallback>
                        {profile?.full_name ? getInitials(profile.full_name) : <UserIcon className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session.user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/perfil">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Meu Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  {whatsappLink && (
                    <DropdownMenuItem onClick={handleOpenWhatsappGroup}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      <span>Grupo WhatsApp</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="py-1 text-center text-xs text-muted-foreground">
                        v1.0.0
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-primary-foreground">
                      <MenuIcon className="h-6 w-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[280px] p-4 flex flex-col">
                    <div className="mb-6">
                      <Link to="/" className="flex items-center gap-2">
                        <img src={babaLogoUrl} alt="Logo" className="h-8 w-8 object-contain" />
                        <span className="text-lg font-bold">{babaName || "Futebol dos Amigos"}</span>
                      </Link>
                    </div>
                    <nav className="flex flex-col gap-2">
                      {navItems.map((item) => (
                        <MobileNavLink key={item.path} to={item.path} Icon={item.Icon}>
                          {item.label}
                        </MobileNavLink>
                      ))}
                    </nav>
                    <div className="mt-auto">
                      <Separator className="my-4" />
                      <div className="flex flex-col gap-2">
                        <MobileNavLink to="/perfil" Icon={UserIcon}>
                          Meu Perfil
                        </MobileNavLink>
                        {whatsappLink && (
                          <SheetClose asChild>
                            <Button
                              variant="ghost"
                              onClick={handleOpenWhatsappGroup}
                              className="flex items-center justify-start gap-4 px-2.5 py-2 text-muted-foreground hover:text-foreground"
                            >
                              <MessageCircle className="h-5 w-5" />
                              <span>Grupo WhatsApp</span>
                            </Button>
                          </SheetClose>
                        )}
                        <SheetClose asChild>
                          <Button
                            variant="ghost"
                            onClick={handleSignOut}
                            className="flex items-center justify-start gap-4 px-2.5 py-2 text-muted-foreground hover:text-foreground"
                          >
                            <LogOutIcon className="h-5 w-5" />
                            <span>Sair</span>
                          </Button>
                        </SheetClose>
                      </div>
                      <div className="pt-4 text-center text-xs text-muted-foreground">
                        v1.0.0
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          ) : showAuthButtons ? (
            <Button asChild variant="secondary" className="text-primary">
              <Link to="/auth">
                <LogInIcon className="mr-2 h-4 w-4" />
                Entrar
              </Link>
            </Button>
          ) : null }
        </div>
      </div>
    </header>
  );
}