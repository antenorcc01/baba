// Este arquivo será preenchido automaticamente com os tipos do Supabase.
// Para gerar os tipos, execute o seguinte comando no seu terminal:
// supabase gen types typescript --project-id xuecwnkkukmgftpdbqxx > src/types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      arenas: {
        Row: {
          address: string
          created_at: string
          id: number
          image_url: string | null
          name: string
          price: number | null
          type: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: number
          image_url?: string | null
          name: string
          price?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: number
          image_url?: string | null
          name?: string
          price?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_goals: {
        Row: {
          created_at: string
          game_match_id: string
          id: string
          scoring_guest_player_id: number | null
          scoring_player_id: string | null
          scoring_team_name: string
        }
        Insert: {
          created_at?: string
          game_match_id: string
          id?: string
          scoring_guest_player_id?: number | null
          scoring_player_id?: string | null
          scoring_team_name: string
        }
        Update: {
          created_at?: string
          game_match_id?: string
          id?: string
          scoring_guest_player_id?: number | null
          scoring_player_id?: string | null
          scoring_team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_goals_game_match_id_fkey"
            columns: ["game_match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_goals_scoring_guest_player_id_fkey"
            columns: ["scoring_guest_player_id"]
            isOneToOne: false
            referencedRelation: "guest_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_goals_scoring_player_id_fkey"
            columns: ["scoring_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      game_matches: {
        Row: {
          arena_id: number | null
          created_at: string
          duration_minutes: number
          end_time: string | null
          game_id: number
          id: string
          match_number: number
          round: string
          score1: number
          score2: number
          start_time: string | null
          status: "scheduled" | "in_progress" | "completed" | "cancelled"
          team1_id: string | null
          team1_name: string
          team2_id: string | null
          team2_name: string
          updated_at: string
          win_condition_goals: number
          winner_team_id: string | null
        }
        Insert: {
          arena_id?: number | null
          created_at?: string
          duration_minutes?: number
          end_time?: string | null
          game_id: number
          id?: string
          match_number: number
          round: string
          score1?: number
          score2?: number
          start_time?: string | null
          status?: "scheduled" | "in_progress" | "completed" | "cancelled"
          team1_id?: string | null
          team1_name: string
          team2_id?: string | null
          team2_name: string
          updated_at?: string
          win_condition_goals?: number
          winner_team_id?: string | null
        }
        Update: {
          arena_id?: number | null
          created_at?: string
          duration_minutes?: number
          end_time?: string | null
          game_id?: number
          id?: string
          match_number?: number
          round?: string
          score1?: number
          score2?: number
          start_time?: string | null
          status?: "scheduled" | "in_progress" | "completed" | "cancelled"
          team1_id?: string | null
          team1_name?: string
          team2_id?: string | null
          team2_name?: string
          updated_at?: string
          win_condition_goals?: number
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_matches_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          }
        ]
      }
      games: {
        Row: {
          arena_id: number | null
          created_at: string
          default_match_duration_minutes: number
          default_match_win_goals: number
          game_date: string
          generated_teams: Json | null
          id: number
          max_players: number
          notes: string | null
          status: "Agendado" | "Confirmado" | "Cancelado" | "Finalizado"
          updated_at: string
        }
        Insert: {
          arena_id?: number | null
          created_at?: string
          default_match_duration_minutes?: number
          default_match_win_goals?: number
          game_date: string
          generated_teams?: Json | null
          id?: number
          max_players: number
          notes?: string | null
          status?: "Agendado" | "Confirmado" | "Cancelado" | "Finalizado"
          updated_at?: string
        }
        Update: {
          arena_id?: number | null
          created_at?: string
          default_match_duration_minutes?: number
          default_match_win_goals?: number
          game_date?: string
          generated_teams?: Json | null
          id?: number
          max_players?: number
          notes?: string | null
          status?: "Agendado" | "Confirmado" | "Cancelado" | "Finalizado"
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          }
        ]
      }
      games_guest_players: {
        Row: {
          created_at: string
          game_id: number
          guest_player_id: number
          id: number
        }
        Insert: {
          created_at?: string
          game_id: number
          guest_player_id: number
          id?: number
        }
        Update: {
          created_at?: string
          game_id?: number
          guest_player_id?: number
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "games_guest_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_guest_players_guest_player_id_fkey"
            columns: ["guest_player_id"]
            isOneToOne: false
            referencedRelation: "guest_players"
            referencedColumns: ["id"]
          }
        ]
      }
      games_players: {
        Row: {
          created_at: string
          game_id: number
          id: number
          player_id: string
        }
        Insert: {
          created_at?: string
          game_id: number
          id?: number
          player_id: string
        }
        Update: {
          created_at?: string
          game_id?: number
          id?: number
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      group_rules: {
        Row: {
          created_at: string
          description: string
          id: number
          order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: number
          order: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_settings: {
        Row: {
          created_at: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      guest_players: {
        Row: {
          created_at: string
          full_name: string
          id: number
          invited_by: string | null
          is_deleted: boolean
          is_suspended: boolean
          player_type: string | null
          phone: string | null
          skill_level: number
          suspension_end_date: string | null
          suspension_reason: string | null
          titles: number
          total_goals: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: number
          invited_by?: string | null
          is_deleted?: boolean
          is_suspended?: boolean
          player_type?: string | null
          phone?: string | null
          skill_level?: number
          suspension_end_date?: string | null
          suspension_reason?: string | null
          titles?: number
          total_goals?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: number
          invited_by?: string | null
          is_deleted?: boolean
          is_suspended?: boolean
          player_type?: string | null
          phone?: string | null
          skill_level?: number
          suspension_end_date?: string | null
          suspension_reason?: string | null
          titles?: number
          total_goals?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_players_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          guest_player_id: number | null
          id: number
          payment_date: string
          player_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description: string
          guest_player_id?: number | null
          id?: number
          payment_date: string
          player_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          guest_player_id?: number | null
          id?: number
          payment_date?: string
          player_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_guest_player_id_fkey"
            columns: ["guest_player_id"]
            isOneToOne: false
            referencedRelation: "guest_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          full_name: string | null
          id: string
          instagram: string | null
          is_deleted: boolean
          is_mensalista: boolean
          is_suspended: boolean
          last_name: string | null
          payment_status: "diarista" | "pago" | "pendente" | "atrasado"
          phone: string | null
          player_type: string | null
          profile_picture_url: string | null
          role: "player" | "admin"
          skill_level: number
          suspension_end_date: string | null
          suspension_reason: string | null
          titles: number
          total_goals: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id: string
          instagram?: string | null
          is_deleted?: boolean
          is_mensalista?: boolean
          is_suspended?: boolean
          last_name?: string | null
          payment_status?: "diarista" | "pago" | "pendente" | "atrasado"
          phone?: string | null
          player_type?: string | null
          profile_picture_url?: string | null
          role?: "player" | "admin"
          skill_level?: number
          suspension_end_date?: string | null
          suspension_reason?: string | null
          titles?: number
          total_goals?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          is_deleted?: boolean
          is_mensalista?: boolean
          is_suspended?: boolean
          last_name?: string | null
          payment_status?: "diarista" | "pago" | "pendente" | "atrasado"
          phone?: string | null
          player_type?: string | null
          profile_picture_url?: string | null
          role?: "player" | "admin"
          skill_level?: number
          suspension_end_date?: string | null
          suspension_reason?: string | null
          titles?: number
          total_goals?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tournament_matches: {
        Row: {
          arena_id: number | null
          created_at: string
          id: string
          match_date: string | null
          match_number: number
          round: string
          score1: number | null
          score2: number | null
          status: "scheduled" | "in_progress" | "completed" | "cancelled"
          team1_id: string | null
          team2_id: string | null
          tournament_id: string
          updated_at: string
          winner_team_id: string | null
        }
        Insert: {
          arena_id?: number | null
          created_at?: string
          id?: string
          match_date?: string | null
          match_number: number
          round: string
          score1?: number | null
          score2?: number | null
          status?: "scheduled" | "in_progress" | "completed" | "cancelled"
          team1_id?: string | null
          team2_id?: string | null
          tournament_id: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Update: {
          arena_id?: number | null
          created_at?: string
          id?: string
          match_date?: string | null
          match_number?: number
          round?: string
          score1?: number | null
          score2?: number | null
          status?: "scheduled" | "in_progress" | "completed" | "cancelled"
          team1_id?: string | null
          team2_id?: string | null
          tournament_id?: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          }
        ]
      }
      tournament_registrations: {
        Row: {
          created_at: string
          enrollment_fee_paid: number
          guest_player_id: number | null
          id: string
          payment_status: "pendente" | "pago" | "isento"
          player_id: string | null
          tournament_id: string
        }
        Insert: {
          created_at?: string
          enrollment_fee_paid?: number
          guest_player_id?: number | null
          id?: string
          payment_status?: "pendente" | "pago" | "isento"
          player_id?: string | null
          tournament_id: string
        }
        Update: {
          created_at?: string
          enrollment_fee_paid?: number
          guest_player_id?: number | null
          id?: string
          payment_status?: "pendente" | "pago" | "isento"
          player_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_guest_player_id_fkey"
            columns: ["guest_player_id"]
            isOneToOne: false
            referencedRelation: "guest_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          }
        ]
      }
      tournament_team_players: {
        Row: {
          created_at: string
          guest_player_id: number | null
          id: number
          player_id: string | null
          tournament_team_id: string
        }
        Insert: {
          created_at?: string
          guest_player_id?: number | null
          id?: number
          player_id?: string | null
          tournament_team_id: string
        }
        Update: {
          created_at?: string
          guest_player_id?: number | null
          id?: number
          player_id?: string | null
          tournament_team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_team_players_guest_player_id_fkey"
            columns: ["guest_player_id"]
            isOneToOne: false
            referencedRelation: "guest_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_team_players_tournament_team_id_fkey"
            columns: ["tournament_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          }
        ]
      }
      tournament_teams: {
        Row: {
          created_at: string
          group_name: string | null
          id: string
          name: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_name?: string | null
          id?: string
          name: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_name?: string | null
          id?: string
          name?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          }
        ]
      }
      tournaments: {
        Row: {
          arena_id: number | null
          champion_team_id: string | null
          created_at: string
          created_by: string | null
          enrollment_fee_amount: number
          has_enrollment_fee: boolean
          id: string
          name: string
          num_groups: number | null
          num_players_per_team: number
          num_teams: number
          pix_info: string | null
          regulations: string | null
          start_date: string
          status:
            | "draft"
            | "registration_open"
            | "group_stage"
            | "knockout_stage"
            | "finished"
            | "cancelled"
          type: "copa" | "campeonato"
          updated_at: string
        }
        Insert: {
          arena_id?: number | null
          champion_team_id?: string | null
          created_at?: string
          created_by?: string | null
          enrollment_fee_amount?: number
          has_enrollment_fee?: boolean
          id?: string
          name: string
          num_groups?: number | null
          num_players_per_team: number
          num_teams: number
          pix_info?: string | null
          regulations?: string | null
          start_date: string
          status?:
            | "draft"
            | "registration_open"
            | "group_stage"
            | "knockout_stage"
            | "finished"
            | "cancelled"
          type: "copa" | "campeonato"
          updated_at?: string
        }
        Update: {
          arena_id?: number | null
          champion_team_id?: string | null
          created_at?: string
          created_by?: string | null
          enrollment_fee_amount?: number
          has_enrollment_fee?: boolean
          id?: string
          name?: string
          num_groups?: number | null
          num_players_per_team?: number
          num_teams?: number
          pix_info?: string | null
          regulations?: string | null
          start_date?: string
          status?:
            | "draft"
            | "registration_open"
            | "group_stage"
            | "knockout_stage"
            | "finished"
            | "cancelled"
          type?: "copa" | "campeonato"
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_arena_id_fkey"
            columns: ["arena_id"]
            isOneToOne: false
            referencedRelation: "arenas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
  : never