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
      agent_profiles: {
        Row: {
          created_at: string
          has_drivers_license: boolean
          service_city: string
          service_state: string
          service_zip: string
          user_id: string
          vehicle: Database["public"]["Enums"]["agent_vehicle_enum"]
        }
        Insert: {
          created_at?: string
          has_drivers_license?: boolean
          service_city: string
          service_state: string
          service_zip: string
          user_id: string
          vehicle: Database["public"]["Enums"]["agent_vehicle_enum"]
        }
        Update: {
          created_at?: string
          has_drivers_license?: boolean
          service_city?: string
          service_state?: string
          service_zip?: string
          user_id?: string
          vehicle?: Database["public"]["Enums"]["agent_vehicle_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "agent_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      business_members: {
        Row: {
          business_id: string
          member_role: Database["public"]["Enums"]["role_enum"]
          user_id: string
        }
        Insert: {
          business_id: string
          member_role: Database["public"]["Enums"]["role_enum"]
          user_id: string
        }
        Update: {
          business_id?: string
          member_role?: Database["public"]["Enums"]["role_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          business_type: Database["public"]["Enums"]["business_type_enum"]
          city: string
          created_at: string
          ein: string | null
          id: string
          name: string
          state: string
          status: Database["public"]["Enums"]["account_status_enum"]
          street: string
          verified_at: string | null
          zip: string
        }
        Insert: {
          business_type: Database["public"]["Enums"]["business_type_enum"]
          city: string
          created_at?: string
          ein?: string | null
          id?: string
          name: string
          state: string
          status?: Database["public"]["Enums"]["account_status_enum"]
          street: string
          verified_at?: string | null
          zip: string
        }
        Update: {
          business_type?: Database["public"]["Enums"]["business_type_enum"]
          city?: string
          created_at?: string
          ein?: string | null
          id?: string
          name?: string
          state?: string
          status?: Database["public"]["Enums"]["account_status_enum"]
          street?: string
          verified_at?: string | null
          zip?: string
        }
        Relationships: []
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
      job_assignments: {
        Row: {
          actual_units: number | null
          agent_id: string
          arrived_at: string | null
          claimed_at: string
          collected_at: string | null
          created_at: string
          id: string
          notes: string | null
          quote_id: string | null
          request_id: string | null
          status: Database["public"]["Enums"]["job_status_enum"]
        }
        Insert: {
          actual_units?: number | null
          agent_id: string
          arrived_at?: string | null
          claimed_at?: string
          collected_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          quote_id?: string | null
          request_id?: string | null
          status?: Database["public"]["Enums"]["job_status_enum"]
        }
        Update: {
          actual_units?: number | null
          agent_id?: string
          arrived_at?: string | null
          claimed_at?: string
          collected_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          quote_id?: string | null
          request_id?: string | null
          status?: Database["public"]["Enums"]["job_status_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "pickup_requests"
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
      pickup_request_items: {
        Row: {
          category: Database["public"]["Enums"]["device_category_enum"]
          confidence: number | null
          created_at: string
          id: string
          make: string | null
          model: string | null
          request_id: string
          serial: string | null
          source: string
        }
        Insert: {
          category: Database["public"]["Enums"]["device_category_enum"]
          confidence?: number | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          request_id: string
          serial?: string | null
          source?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["device_category_enum"]
          confidence?: number | null
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          request_id?: string
          serial?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "pickup_requests"
            referencedColumns: ["id"]
          },
        ]
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
      price_catalog_versions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          published_at: string | null
          published_by: string | null
          status: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          published_at?: string | null
          published_by?: string | null
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_catalog_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_items: {
        Row: {
          catalog_version_id: string
          category: Database["public"]["Enums"]["device_category_enum"]
          component_key: string
          created_at: string
          display_name: string
          grade: Database["public"]["Enums"]["price_grade_enum"]
          id: string
          unit: Database["public"]["Enums"]["price_unit_enum"]
          unit_price_cents: number
        }
        Insert: {
          catalog_version_id: string
          category: Database["public"]["Enums"]["device_category_enum"]
          component_key: string
          created_at?: string
          display_name: string
          grade: Database["public"]["Enums"]["price_grade_enum"]
          id?: string
          unit?: Database["public"]["Enums"]["price_unit_enum"]
          unit_price_cents: number
        }
        Update: {
          catalog_version_id?: string
          category?: Database["public"]["Enums"]["device_category_enum"]
          component_key?: string
          created_at?: string
          display_name?: string
          grade?: Database["public"]["Enums"]["price_grade_enum"]
          id?: string
          unit?: Database["public"]["Enums"]["price_unit_enum"]
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_items_catalog_version_id_fkey"
            columns: ["catalog_version_id"]
            isOneToOne: false
            referencedRelation: "price_catalog_versions"
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
      quote_items: {
        Row: {
          component_key: string
          confidence: number | null
          display_name: string
          grade: Database["public"]["Enums"]["price_grade_enum"]
          id: string
          line_total_cents: number
          notes: string | null
          quantity: number
          quote_id: string
          source: string
          unit: Database["public"]["Enums"]["price_unit_enum"]
          unit_price_cents: number
        }
        Insert: {
          component_key: string
          confidence?: number | null
          display_name: string
          grade: Database["public"]["Enums"]["price_grade_enum"]
          id?: string
          line_total_cents: number
          notes?: string | null
          quantity: number
          quote_id: string
          source?: string
          unit: Database["public"]["Enums"]["price_unit_enum"]
          unit_price_cents: number
        }
        Update: {
          component_key?: string
          confidence?: number | null
          display_name?: string
          grade?: Database["public"]["Enums"]["price_grade_enum"]
          id?: string
          line_total_cents?: number
          notes?: string | null
          quantity?: number
          quote_id?: string
          source?: string
          unit?: Database["public"]["Enums"]["price_unit_enum"]
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          business_id: string
          catalog_version_id: string
          created_at: string
          created_by: string
          decided_at: string | null
          expires_at: string
          id: string
          status: Database["public"]["Enums"]["quote_status_enum"]
          total_cents: number
        }
        Insert: {
          business_id: string
          catalog_version_id: string
          created_at?: string
          created_by: string
          decided_at?: string | null
          expires_at?: string
          id?: string
          status?: Database["public"]["Enums"]["quote_status_enum"]
          total_cents: number
        }
        Update: {
          business_id?: string
          catalog_version_id?: string
          created_at?: string
          created_by?: string
          decided_at?: string | null
          expires_at?: string
          id?: string
          status?: Database["public"]["Enums"]["quote_status_enum"]
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_catalog_version_id_fkey"
            columns: ["catalog_version_id"]
            isOneToOne: false
            referencedRelation: "price_catalog_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      pending_accounts: {
        Row: {
          created_at: string | null
          id: string | null
          kind: string | null
          name: string | null
          status: Database["public"]["Enums"]["account_status_enum"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_org_invitation: { Args: { p_code: string }; Returns: string }
      add_pickup_request_items: {
        Args: { p_items: Json; p_request_id: string }
        Returns: number
      }
      advance_job: {
        Args: {
          p_actual_units?: number
          p_job_id: string
          p_notes?: string
          p_status: Database["public"]["Enums"]["job_status_enum"]
        }
        Returns: undefined
      }
      advance_pickup_request: {
        Args: {
          p_request_id: string
          p_status: Database["public"]["Enums"]["request_status_enum"]
        }
        Returns: undefined
      }
      can_manage_request: { Args: { p_request_id: string }; Returns: boolean }
      cancel_pickup_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      claim_collection: { Args: { p_quote_id: string }; Returns: string }
      claim_job: { Args: { p_request_id: string }; Returns: string }
      create_business_with_owner: {
        Args: {
          p_business_name: string
          p_business_type: Database["public"]["Enums"]["business_type_enum"]
          p_city: string
          p_ein: string
          p_full_name: string
          p_phone: string
          p_state: string
          p_street: string
          p_user_id: string
          p_zip: string
        }
        Returns: string
      }
      create_field_agent: {
        Args: {
          p_full_name: string
          p_has_drivers_license: boolean
          p_phone: string
          p_service_city: string
          p_service_state: string
          p_service_zip: string
          p_user_id: string
          p_vehicle: Database["public"]["Enums"]["agent_vehicle_enum"]
        }
        Returns: string
      }
      create_organization_with_owner: {
        Args: {
          p_city: string
          p_dock_access: boolean
          p_full_name: string
          p_org_name: string
          p_org_type: Database["public"]["Enums"]["org_type_enum"]
          p_phone: string
          p_state: string
          p_street: string
          p_user_id: string
          p_zip: string
        }
        Returns: string
      }
      create_price_catalog_draft: { Args: { p_note?: string }; Returns: string }
      create_quote: {
        Args: { p_business_id: string; p_items: Json }
        Returns: string
      }
      current_price: {
        Args: {
          p_component_key: string
          p_grade: Database["public"]["Enums"]["price_grade_enum"]
        }
        Returns: {
          catalog_version_id: string
          display_name: string
          unit: Database["public"]["Enums"]["price_unit_enum"]
          unit_price_cents: number
          version: number
        }[]
      }
      decide_quote: {
        Args: { p_accept: boolean; p_quote_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["role_enum"]
          p_scope?: string
        }
        Returns: boolean
      }
      invite_org_member: {
        Args: {
          p_email: string
          p_org_id: string
          p_role: Database["public"]["Enums"]["role_enum"]
        }
        Returns: Json
      }
      is_assigned_agent: { Args: { p_request_id: string }; Returns: boolean }
      is_assigned_agent_for_quote: {
        Args: { p_quote_id: string }
        Returns: boolean
      }
      is_business_member: { Args: { p_business: string }; Returns: boolean }
      is_field_agent: { Args: never; Returns: boolean }
      is_org_member: { Args: { p_org: string }; Returns: boolean }
      is_platform_staff: { Args: never; Returns: boolean }
      list_available_jobs: {
        Args: never
        Returns: {
          account_name: string
          city: string
          kind: string
          payout_cents: number
          state: string
          street: string
          subject_id: string
          timezone: string
          unit_count: number
          window_end: string
          window_start: string
        }[]
      }
      list_my_jobs: {
        Args: never
        Returns: {
          account_name: string
          city: string
          claimed_at: string
          collected_at: string
          id: string
          kind: string
          payout_cents: number
          state: string
          status: Database["public"]["Enums"]["job_status_enum"]
          street: string
          subject_id: string
          timezone: string
          unit_count: number
          window_end: string
          window_start: string
          zip: string
        }[]
      }
      list_organization_invitations: {
        Args: { p_org_id: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["role_enum"]
        }[]
      }
      list_organization_members: {
        Args: { p_org_id: string }
        Returns: {
          email: string
          full_name: string
          joined_at: string
          member_role: Database["public"]["Enums"]["role_enum"]
          user_id: string
        }[]
      }
      list_quotes: {
        Args: { p_business_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          item_count: number
          status: Database["public"]["Enums"]["quote_status_enum"]
          total_cents: number
        }[]
      }
      my_agent_summary: {
        Args: never
        Returns: {
          collected_value_cents: number
          devices_collected: number
          jobs_active: number
          jobs_completed: number
        }[]
      }
      my_org_summary: {
        Args: { p_org_id: string }
        Returns: {
          active_count: number
          active_devices: number
          completed_count: number
          devices_recycled: number
          next_pickup: string
        }[]
      }
      owns_quote: { Args: { p_quote_id: string }; Returns: boolean }
      owns_request: { Args: { p_request_id: string }; Returns: boolean }
      publish_price_catalog: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      remove_org_member: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: undefined
      }
      reschedule_pickup_request: {
        Args: {
          p_request_id: string
          p_window_end: string
          p_window_start: string
        }
        Returns: undefined
      }
      set_agent_status: {
        Args: {
          p_status: Database["public"]["Enums"]["account_status_enum"]
          p_user_id: string
        }
        Returns: undefined
      }
      set_business_status: {
        Args: {
          p_business_id: string
          p_status: Database["public"]["Enums"]["account_status_enum"]
        }
        Returns: undefined
      }
      set_org_member_role: {
        Args: {
          p_org_id: string
          p_role: Database["public"]["Enums"]["role_enum"]
          p_user_id: string
        }
        Returns: undefined
      }
      set_organization_status: {
        Args: {
          p_org_id: string
          p_status: Database["public"]["Enums"]["account_status_enum"]
        }
        Returns: undefined
      }
      set_price_item: {
        Args: {
          p_category: Database["public"]["Enums"]["device_category_enum"]
          p_component_key: string
          p_display_name: string
          p_grade: Database["public"]["Enums"]["price_grade_enum"]
          p_unit: Database["public"]["Enums"]["price_unit_enum"]
          p_unit_price_cents: number
          p_version_id: string
        }
        Returns: undefined
      }
      update_own_organization: {
        Args: {
          p_city: string
          p_dock_access: boolean
          p_facility_timezone?: string
          p_name: string
          p_org_id: string
          p_org_type: Database["public"]["Enums"]["org_type_enum"]
          p_state: string
          p_street: string
          p_zip: string
        }
        Returns: undefined
      }
      update_own_profile: {
        Args: { p_avatar_url?: string; p_full_name: string; p_phone?: string }
        Returns: undefined
      }
    }
    Enums: {
      account_status_enum:
        | "pending_verification"
        | "active"
        | "suspended"
        | "rejected"
        | "archived"
      agent_vehicle_enum: "car" | "van" | "box_truck" | "none"
      business_type_enum:
        | "repair_shop"
        | "electronics_retailer"
        | "scrap_dealer"
        | "it_reseller"
        | "refurbisher"
        | "other"
      device_category_enum:
        | "computers_laptops"
        | "monitors_displays"
        | "server_gear"
        | "copiers_printers"
        | "batteries_ups"
      job_status_enum:
        | "claimed"
        | "en_route"
        | "on_site"
        | "collected"
        | "cancelled"
      org_type_enum:
        | "k12_school"
        | "university"
        | "hospital"
        | "municipal_office"
        | "corporate_hq"
        | "other"
      price_grade_enum: "working" | "broken" | "parts"
      price_unit_enum: "each" | "lb"
      quote_status_enum: "offered" | "accepted" | "declined" | "expired"
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
      agent_vehicle_enum: ["car", "van", "box_truck", "none"],
      business_type_enum: [
        "repair_shop",
        "electronics_retailer",
        "scrap_dealer",
        "it_reseller",
        "refurbisher",
        "other",
      ],
      device_category_enum: [
        "computers_laptops",
        "monitors_displays",
        "server_gear",
        "copiers_printers",
        "batteries_ups",
      ],
      job_status_enum: [
        "claimed",
        "en_route",
        "on_site",
        "collected",
        "cancelled",
      ],
      org_type_enum: [
        "k12_school",
        "university",
        "hospital",
        "municipal_office",
        "corporate_hq",
        "other",
      ],
      price_grade_enum: ["working", "broken", "parts"],
      price_unit_enum: ["each", "lb"],
      quote_status_enum: ["offered", "accepted", "declined", "expired"],
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

