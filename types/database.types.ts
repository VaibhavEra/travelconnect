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
      failed_login_attempts: {
        Row: {
          attempted_at: string | null
          email: string
          id: string
          ip_address: string | null
        }
        Insert: {
          attempted_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          attempted_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      parcel_requests: {
        Row: {
          accepted_at: string | null
          cancelled_by: string | null
          category: string
          created_at: string | null
          delivered_at: string | null
          delivery_blocked_until: string | null
          delivery_contact_name: string
          delivery_contact_phone: string
          delivery_otp: string | null
          delivery_otp_expiry: string | null
          failed_delivery_attempts: number | null
          failed_pickup_attempts: number | null
          id: string
          item_description: string
          parcel_photos: string[]
          picked_up_at: string | null
          pickup_blocked_until: string | null
          pickup_otp: string | null
          pickup_otp_expiry: string | null
          rejected_at: string | null
          rejection_reason: string | null
          sender_id: string
          sender_notes: string | null
          size: string
          status: string
          traveller_notes: string | null
          trip_id: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancelled_by?: string | null
          category: string
          created_at?: string | null
          delivered_at?: string | null
          delivery_blocked_until?: string | null
          delivery_contact_name: string
          delivery_contact_phone: string
          delivery_otp?: string | null
          delivery_otp_expiry?: string | null
          failed_delivery_attempts?: number | null
          failed_pickup_attempts?: number | null
          id?: string
          item_description: string
          parcel_photos?: string[]
          picked_up_at?: string | null
          pickup_blocked_until?: string | null
          pickup_otp?: string | null
          pickup_otp_expiry?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          sender_id: string
          sender_notes?: string | null
          size: string
          status?: string
          traveller_notes?: string | null
          trip_id: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancelled_by?: string | null
          category?: string
          created_at?: string | null
          delivered_at?: string | null
          delivery_blocked_until?: string | null
          delivery_contact_name?: string
          delivery_contact_phone?: string
          delivery_otp?: string | null
          delivery_otp_expiry?: string | null
          failed_delivery_attempts?: number | null
          failed_pickup_attempts?: number | null
          id?: string
          item_description?: string
          parcel_photos?: string[]
          picked_up_at?: string | null
          pickup_blocked_until?: string | null
          pickup_otp?: string | null
          pickup_otp_expiry?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          sender_id?: string
          sender_notes?: string | null
          size?: string
          status?: string
          traveller_notes?: string | null
          trip_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcel_requests_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcel_requests_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string
          rating: number | null
          rating_count: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone: string
          rating?: number | null
          rating_count?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string
          rating?: number | null
          rating_count?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          allowed_categories: string[] | null
          arrival_date: string
          arrival_time: string
          available_slots: number | null
          created_at: string | null
          departure_date: string
          departure_time: string
          destination: string
          id: string
          notes: string | null
          pnr_number: string
          source: string
          status: string | null
          ticket_file_url: string
          total_slots: number | null
          transport_mode: string
          traveller_id: string
          updated_at: string | null
        }
        Insert: {
          allowed_categories?: string[] | null
          arrival_date: string
          arrival_time: string
          available_slots?: number | null
          created_at?: string | null
          departure_date: string
          departure_time: string
          destination: string
          id?: string
          notes?: string | null
          pnr_number: string
          source: string
          status?: string | null
          ticket_file_url: string
          total_slots?: number | null
          transport_mode: string
          traveller_id: string
          updated_at?: string | null
        }
        Update: {
          allowed_categories?: string[] | null
          arrival_date?: string
          arrival_time?: string
          available_slots?: number | null
          created_at?: string | null
          departure_date?: string
          departure_time?: string
          destination?: string
          id?: string
          notes?: string | null
          pnr_number?: string
          source?: string
          status?: string | null
          ticket_file_url?: string
          total_slots?: number | null
          transport_mode?: string
          traveller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_traveller_id_fkey"
            columns: ["traveller_id"]
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
      accept_request_atomic: {
        Args: { p_request_id: string; p_traveller_notes?: string }
        Returns: Json
      }
      can_edit_trip: { Args: { p_trip_id: string }; Returns: boolean }
      cancel_request_with_validation: {
        Args: {
          p_cancellation_reason?: string
          p_cancelled_by: string
          p_request_id: string
        }
        Returns: Json
      }
      check_email_available: { Args: { check_email: string }; Returns: boolean }
      check_phone_available: { Args: { check_phone: string }; Returns: boolean }
      check_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
      clear_failed_attempts: {
        Args: { user_email: string }
        Returns: undefined
      }
      create_request_with_validation: {
        Args: {
          p_category: string
          p_delivery_contact_name: string
          p_delivery_contact_phone: string
          p_item_description: string
          p_parcel_photos: string[]
          p_sender_notes?: string
          p_size: string
          p_trip_id: string
        }
        Returns: string
      }
      create_trip_with_validation: {
        Args: {
          p_allowed_categories: string[]
          p_arrival_date: string
          p_arrival_time: string
          p_departure_date: string
          p_departure_time: string
          p_destination: string
          p_notes?: string
          p_pnr_number: string
          p_source: string
          p_ticket_file_url: string
          p_total_slots: number
          p_transport_mode: string
        }
        Returns: string
      }
      expire_old_requests: {
        Args: never
        Returns: {
          cleaned_attempts_count: number
          expired_requests_count: number
          expired_trips_count: number
        }[]
      }
      generate_otp: { Args: never; Returns: string }
      generate_pickup_otp: { Args: { request_id: string }; Returns: string }
      is_account_locked: { Args: { user_email: string }; Returns: boolean }
      is_trip_available: { Args: { p_trip_id: string }; Returns: boolean }
      lock_trips_before_24h: { Args: never; Returns: number }
      record_failed_login: {
        Args: { user_email: string; user_ip?: string }
        Returns: undefined
      }
      validate_slot_reduction: {
        Args: { p_new_total_slots: number; p_trip_id: string }
        Returns: boolean
      }
      validate_trip_dates: {
        Args: {
          p_arrival_date: string
          p_arrival_time: string
          p_departure_date: string
          p_departure_time: string
        }
        Returns: boolean
      }
      verify_delivery_otp: {
        Args: { p_otp: string; p_request_id: string }
        Returns: Json
      }
      verify_pickup_otp: {
        Args: { p_otp: string; p_request_id: string }
        Returns: Json
      }
    }
    Enums: {
      cancellation_source: "sender" | "traveller"
      parcel_category:
        | "documents"
        | "clothing"
        | "medicines"
        | "books"
        | "small_items"
      parcel_size: "small" | "medium" | "large"
      request_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "picked_up"
        | "delivered"
        | "cancelled"
        | "expired"
        | "failed"
      transport_mode: "flight" | "train" | "bus" | "car"
      trip_status:
        | "upcoming"
        | "locked"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "expired"
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
      cancellation_source: ["sender", "traveller"],
      parcel_category: [
        "documents",
        "clothing",
        "medicines",
        "books",
        "small_items",
      ],
      parcel_size: ["small", "medium", "large"],
      request_status: [
        "pending",
        "accepted",
        "rejected",
        "picked_up",
        "delivered",
        "cancelled",
        "expired",
        "failed",
      ],
      transport_mode: ["flight", "train", "bus", "car"],
      trip_status: [
        "upcoming",
        "locked",
        "in_progress",
        "completed",
        "cancelled",
        "expired",
      ],
    },
  },
} as const
