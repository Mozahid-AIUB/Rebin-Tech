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
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          payload_json: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          payload_json?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          payload_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["role_enum"]
          scope_id: string | null
          token_hash: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["role_enum"]
          scope_id?: string | null
          token_hash: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["role_enum"]
          scope_id?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          member_role: Database["public"]["Enums"]["role_enum"]
          org_id: string
          user_id: string
        }
        Insert: {
          member_role: Database["public"]["Enums"]["role_enum"]
          org_id: string
          user_id: string
        }
        Update: {
          member_role?: Database["public"]["Enums"]["role_enum"]
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          city: string
          created_at: string
          dock_access: boolean
          facility_timezone: string
          id: string
          name: string
          org_type: Database["public"]["Enums"]["org_type_enum"]
          state: string
          status: Database["public"]["Enums"]["account_status_enum"]
          street: string
          verified_at: string | null
          zip: string
        }
        Insert: {
          city: string
          created_at?: string
          dock_access?: boolean
          facility_timezone?: string
          id?: string
          name: string
          org_type: Database["public"]["Enums"]["org_type_enum"]
          state: string
          status?: Database["public"]["Enums"]["account_status_enum"]
          street: string
          verified_at?: string | null
          zip: string
        }
        Update: {
          city?: string
          created_at?: string
          dock_access?: boolean
          facility_timezone?: string
          id?: string
          name?: string
          org_type?: Database["public"]["Enums"]["org_type_enum"]
          state?: string
          status?: Database["public"]["Enums"]["account_status_enum"]
          street?: string
          verified_at?: string | null
          zip?: string
        }
        Relationships: []
      }
      pickup_requests: {
        Row: {
          categories: Database["public"]["Enums"]["device_category_enum"][]
          created_at: string
          created_by: string
          dock_address: string
          id: string
          instructions: string
          on_site_contact_name: string
          on_site_contact_phone: string
          org_id: string
          size_tier: Database["public"]["Enums"]["size_tier_enum"]
          status: Database["public"]["Enums"]["request_status_enum"]
          timezone: string
          unit_count: number
          window_end: string
          window_start: string
        }
        Insert: {
          categories: Database["public"]["Enums"]["device_category_enum"][]
          created_at?: string
          created_by: string
          dock_address: string
          id?: string
          instructions?: string
          on_site_contact_name: string
          on_site_contact_phone: string
          org_id: string
          size_tier: Database["public"]["Enums"]["size_tier_enum"]
          status?: Database["public"]["Enums"]["request_status_enum"]
          timezone: string
          unit_count: number
          window_end: string
          window_start: string
        }
        Update: {
          categories?: Database["public"]["Enums"]["device_category_enum"][]
          created_at?: string
          created_by?: string
          dock_address?: string
          id?: string
          instructions?: string
          on_site_contact_name?: string
          on_site_contact_phone?: string
          org_id?: string
          size_tier?: Database["public"]["Enums"]["size_tier_enum"]
          status?: Database["public"]["Enums"]["request_status_enum"]
          timezone?: string
          unit_count?: number
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["account_status_enum"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status_enum"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status_enum"]
        }
        Relationships: []
      }
      role_assignments: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["role_enum"]
          scope_id: string | null
          scope_type: Database["public"]["Enums"]["scope_enum"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["role_enum"]
          scope_id?: string | null
          scope_type: Database["public"]["Enums"]["scope_enum"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["role_enum"]
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["scope_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["role_enum"]
          p_scope?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_status_enum:
        | "pending_verification"
        | "active"
        | "suspended"
        | "rejected"
        | "archived"
      device_category_enum:
        | "computers_laptops"
        | "monitors_displays"
        | "server_gear"
        | "copiers_printers"
        | "batteries_ups"
      org_type_enum:
        | "k12_school"
        | "university"
        | "hospital"
        | "municipal_office"
        | "corporate_hq"
        | "other"
      request_status_enum:
        | "pending"
        | "under_review"
        | "scheduled"
        | "dispatched"
        | "in_transit"
        | "completed"
        | "cancelled"
      role_enum:
        | "platform_owner"
        | "platform_ops"
        | "platform_finance"
        | "platform_support"
        | "org_owner"
        | "org_admin"
        | "org_requester"
        | "biz_owner"
        | "biz_staff"
        | "field_agent"
        | "field_lead"
      scope_enum: "platform" | "organization" | "business" | "self"
      size_tier_enum:
        | "tier_10_30"
        | "tier_30_100"
        | "tier_100_300"
        | "tier_300_plus"
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
      account_status_enum: [
        "pending_verification",
        "active",
        "suspended",
        "rejected",
        "archived",
      ],
      device_category_enum: [
        "computers_laptops",
        "monitors_displays",
        "server_gear",
        "copiers_printers",
        "batteries_ups",
      ],
      org_type_enum: [
        "k12_school",
        "university",
        "hospital",
        "municipal_office",
        "corporate_hq",
        "other",
      ],
      request_status_enum: [
        "pending",
        "under_review",
        "scheduled",
        "dispatched",
        "in_transit",
        "completed",
        "cancelled",
      ],
      role_enum: [
        "platform_owner",
        "platform_ops",
        "platform_finance",
        "platform_support",
        "org_owner",
        "org_admin",
        "org_requester",
        "biz_owner",
        "biz_staff",
        "field_agent",
        "field_lead",
      ],
      scope_enum: ["platform", "organization", "business", "self"],
      size_tier_enum: [
        "tier_10_30",
        "tier_30_100",
        "tier_100_300",
        "tier_300_plus",
      ],
    },
  },
} as const

