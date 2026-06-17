export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      competition: {
        Row: {
          id: number
          last_synced_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          id?: number
          last_synced_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          id?: number
          last_synced_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          api_id: number
          away_score: number | null
          away_team_id: string | null
          group: string | null
          home_score: number | null
          home_team_id: string | null
          id: string
          stage: string
          status: string
          updated_at: string
          utc_date: string
        }
        Insert: {
          api_id: number
          away_score?: number | null
          away_team_id?: string | null
          group?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          stage: string
          status: string
          updated_at?: string
          utc_date: string
        }
        Update: {
          api_id?: number
          away_score?: number | null
          away_team_id?: string | null
          group?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          stage?: string
          status?: string
          updated_at?: string
          utc_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_teams: {
        Row: {
          id: string
          player_id: string
          pot: number
          team_id: string
        }
        Insert: {
          id?: string
          player_id: string
          pot: number
          team_id: string
        }
        Update: {
          id?: string
          player_id?: string
          pot?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_teams_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          access_token: string
          created_at: string
          id: string
          is_guest: boolean
          name: string
        }
        Insert: {
          access_token?: string
          created_at?: string
          id?: string
          is_guest?: boolean
          name: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          is_guest?: boolean
          name?: string
        }
        Relationships: []
      }
      ranking_snapshots: {
        Row: {
          created_at: string
          id: string
          player_id: string
          points: number
          rank: number
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          points: number
          rank: number
          snapshot_date: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          points?: number
          rank?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranking_snapshots_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      score_entries: {
        Row: {
          created_at: string
          id: string
          player_id: string
          points: number
          reason: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          points: number
          reason: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          points?: number
          reason?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_entries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_progress: {
        Row: {
          group_draws: number
          group_wins: number
          is_champion: boolean
          stage_reached: string
          team_id: string
          updated_at: string
        }
        Insert: {
          group_draws?: number
          group_wins?: number
          is_champion?: boolean
          stage_reached?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          group_draws?: number
          group_wins?: number
          is_champion?: boolean
          stage_reached?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_progress_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          api_id: number | null
          created_at: string
          flag_emoji: string
          id: string
          name: string
          pot: number
        }
        Insert: {
          api_id?: number | null
          created_at?: string
          flag_emoji?: string
          id?: string
          name: string
          pot: number
        }
        Update: {
          api_id?: number | null
          created_at?: string
          flag_emoji?: string
          id?: string
          name?: string
          pot?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
