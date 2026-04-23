export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      schema_migrations: {
        Row: {
          applied_at: string | null
          description: string | null
          execution_time_ms: number | null
          version: string
        }
        Insert: {
          applied_at?: string | null
          description?: string | null
          execution_time_ms?: number | null
          version: string
        }
        Update: {
          applied_at?: string | null
          description?: string | null
          execution_time_ms?: number | null
          version?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          annual_income: number | null
          country_code: string | null
          created_at: string
          date_of_birth: string | null
          financial_metrics: Json | null
          id: string
          investment_experience_years: number | null
          investment_goals: Json | null
          net_worth: number | null
          phone_number: string | null
          preferred_currency: Database["public"]["Enums"]["currency_code"]
          risk_tolerance: Database["public"]["Enums"]["risk_tolerance_level"]
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_income?: number | null
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          financial_metrics?: Json | null
          id?: string
          investment_experience_years?: number | null
          investment_goals?: Json | null
          net_worth?: number | null
          phone_number?: string | null
          preferred_currency?: Database["public"]["Enums"]["currency_code"]
          risk_tolerance?: Database["public"]["Enums"]["risk_tolerance_level"]
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_income?: number | null
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          financial_metrics?: Json | null
          id?: string
          investment_experience_years?: number | null
          investment_goals?: Json | null
          net_worth?: number | null
          phone_number?: string | null
          preferred_currency?: Database["public"]["Enums"]["currency_code"]
          risk_tolerance?: Database["public"]["Enums"]["risk_tolerance_level"]
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          auto_sync_enabled: boolean
          created_at: string
          dashboard_layout: Json | null
          data_refresh_interval: number
          date_format: string
          default_dashboard_view: string
          id: string
          language: string
          notifications: Json
          privacy_settings: Json
          show_tutorial: boolean
          theme: Database["public"]["Enums"]["theme_preference"]
          time_format: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync_enabled?: boolean
          created_at?: string
          dashboard_layout?: Json | null
          data_refresh_interval?: number
          date_format?: string
          default_dashboard_view?: string
          id?: string
          language?: string
          notifications?: Json
          privacy_settings?: Json
          show_tutorial?: boolean
          theme?: Database["public"]["Enums"]["theme_preference"]
          time_format?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync_enabled?: boolean
          created_at?: string
          dashboard_layout?: Json | null
          data_refresh_interval?: number
          date_format?: string
          default_dashboard_view?: string
          id?: string
          language?: string
          notifications?: Json
          privacy_settings?: Json
          show_tutorial?: boolean
          theme?: Database["public"]["Enums"]["theme_preference"]
          time_format?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          email_verified: boolean
          full_name: string | null
          id: string
          last_login_at: string | null
          login_count: number
          onboarding_completed: boolean
          status: Database["public"]["Enums"]["user_status"]
          terms_accepted: boolean
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          email_verified?: boolean
          full_name?: string | null
          id: string
          last_login_at?: string | null
          login_count?: number
          onboarding_completed?: boolean
          status?: Database["public"]["Enums"]["user_status"]
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          email_verified?: boolean
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          login_count?: number
          onboarding_completed?: boolean
          status?: Database["public"]["Enums"]["user_status"]
          terms_accepted?: boolean
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_onboarding: { Args: { user_uuid: string }; Returns: boolean }
      get_user_complete_profile: { Args: { user_uuid: string }; Returns: Json }
    }
    Enums: {
      currency_code:
        | "USD"
        | "EUR"
        | "GBP"
        | "JPY"
        | "CNY"
        | "VND"
        | "THB"
        | "SGD"
        | "AUD"
        | "CAD"
      risk_tolerance_level:
        | "very_conservative"
        | "conservative"
        | "moderate"
        | "aggressive"
        | "very_aggressive"
      theme_preference: "light" | "dark" | "system"
      user_status: "active" | "inactive" | "suspended" | "pending_verification"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      currency_code: [
        "USD",
        "EUR",
        "GBP",
        "JPY",
        "CNY",
        "VND",
        "THB",
        "SGD",
        "AUD",
        "CAD",
      ],
      risk_tolerance_level: [
        "very_conservative",
        "conservative",
        "moderate",
        "aggressive",
        "very_aggressive",
      ],
      theme_preference: ["light", "dark", "system"],
      user_status: ["active", "inactive", "suspended", "pending_verification"],
    },
  },
} as const

