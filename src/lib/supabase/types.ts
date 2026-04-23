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
    PostgrestVersion: "14.1"
  }
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
      asset_types: {
        Row: {
          category: string
          code: string
          created_at: string | null
          has_dividend: boolean | null
          has_maturity: boolean | null
          icon: string | null
          id: string
          name_en: string
          name_vi: string
          sort_order: number | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          has_dividend?: boolean | null
          has_maturity?: boolean | null
          icon?: string | null
          id?: string
          name_en: string
          name_vi: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          has_dividend?: boolean | null
          has_maturity?: boolean | null
          icon?: string | null
          id?: string
          name_en?: string
          name_vi?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_type_id: string
          created_at: string | null
          currency: string | null
          current_price: number | null
          exchange: string | null
          id: string
          is_active: boolean | null
          name: string
          symbol: string
          updated_at: string | null
        }
        Insert: {
          asset_type_id: string
          created_at?: string | null
          currency?: string | null
          current_price?: number | null
          exchange?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          symbol: string
          updated_at?: string | null
        }
        Update: {
          asset_type_id?: string
          created_at?: string | null
          currency?: string | null
          current_price?: number | null
          exchange?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          symbol?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings: {
        Row: {
          asset_id: string
          average_price: number | null
          created_at: string | null
          current_value: number | null
          id: string
          interest_rate: number | null
          maturity_date: string | null
          portfolio_id: string
          principal_amount: number | null
          total_cost: number | null
          total_shares: number | null
          unrealized_pnl: number | null
          unrealized_pnl_percent: number | null
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          average_price?: number | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          interest_rate?: number | null
          maturity_date?: string | null
          portfolio_id: string
          principal_amount?: number | null
          total_cost?: number | null
          total_shares?: number | null
          unrealized_pnl?: number | null
          unrealized_pnl_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          average_price?: number | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          interest_rate?: number | null
          maturity_date?: string | null
          portfolio_id?: string
          principal_amount?: number | null
          total_cost?: number | null
          total_shares?: number | null
          unrealized_pnl?: number | null
          unrealized_pnl_percent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holdings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      income_receipts: {
        Row: {
          asset_id: string
          created_at: string | null
          dividend_per_share: number | null
          ex_dividend_date: string | null
          gross_amount: number
          id: string
          income_type: string
          net_amount: number | null
          notes: string | null
          payment_date: string
          portfolio_id: string
          record_date: string | null
          shares_held: number | null
          tax_amount: number | null
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          dividend_per_share?: number | null
          ex_dividend_date?: string | null
          gross_amount: number
          id?: string
          income_type: string
          net_amount?: number | null
          notes?: string | null
          payment_date: string
          portfolio_id: string
          record_date?: string | null
          shares_held?: number | null
          tax_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          dividend_per_share?: number | null
          ex_dividend_date?: string | null
          gross_amount?: number
          id?: string
          income_type?: string
          net_amount?: number | null
          notes?: string | null
          payment_date?: string
          portfolio_id?: string
          record_date?: string | null
          shares_held?: number | null
          tax_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "income_receipts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_receipts_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          total_cost: number | null
          total_pnl: number | null
          total_pnl_percent: number | null
          total_value: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          total_cost?: number | null
          total_pnl?: number | null
          total_pnl_percent?: number | null
          total_value?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          total_cost?: number | null
          total_pnl?: number | null
          total_pnl_percent?: number | null
          total_value?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          subscription_expires_at: string | null
          subscription_tier: string | null
          total_income_received: number | null
          total_portfolio_value: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          total_income_received?: number | null
          total_portfolio_value?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          total_income_received?: number | null
          total_portfolio_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      transactions: {
        Row: {
          asset_id: string
          created_at: string | null
          fee: number | null
          id: string
          notes: string | null
          portfolio_id: string
          price: number | null
          quantity: number | null
          tax: number | null
          total_amount: number
          transaction_date: string
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          fee?: number | null
          id?: string
          notes?: string | null
          portfolio_id: string
          price?: number | null
          quantity?: number | null
          tax?: number | null
          total_amount: number
          transaction_date?: string
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          fee?: number | null
          id?: string
          notes?: string | null
          portfolio_id?: string
          price?: number | null
          quantity?: number | null
          tax?: number | null
          total_amount?: number
          transaction_date?: string
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
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
      get_asset_income_history: {
        Args: { p_asset_id: string; p_portfolio_id?: string }
        Returns: {
          dividend_per_share: number
          gross_amount: number
          income_type: string
          net_amount: number
          payment_date: string
          tax_amount: number
        }[]
      }
      get_portfolio_income_summary: {
        Args: {
          p_end_date?: string
          p_portfolio_id: string
          p_start_date?: string
        }
        Returns: {
          dividend_count: number
          interest_count: number
          total_gross: number
          total_net: number
          total_tax: number
        }[]
      }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_complete_profile: { Args: { user_uuid: string }; Returns: Json }
      mark_all_notifications_read: {
        Args: { p_user_id: string }
        Returns: number
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      send_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      update_portfolio_totals: {
        Args: { p_portfolio_id: string }
        Returns: undefined
      }
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
