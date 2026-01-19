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
      packages: {
        Row: {
          accepted_at: string | null
          category: string
          cost: number
          created_at: string | null
          delivered_at: string | null
          delivery_otp: string | null
          delivery_photo: string | null
          id: string
          photos: string[] | null
          picked_at: string | null
          pickup_otp: string | null
          pickup_photo: string | null
          receiver_name: string
          receiver_phone: string
          sender_id: string
          status: string | null
          trip_id: string
          updated_at: string | null
          weight: string
        }
        Insert: {
          accepted_at?: string | null
          category: string
          cost: number
          created_at?: string | null
          delivered_at?: string | null
          delivery_otp?: string | null
          delivery_photo?: string | null
          id?: string
          photos?: string[] | null
          picked_at?: string | null
          pickup_otp?: string | null
          pickup_photo?: string | null
          receiver_name: string
          receiver_phone: string
          sender_id: string
          status?: string | null
          trip_id: string
          updated_at?: string | null
          weight: string
        }
        Update: {
          accepted_at?: string | null
          category?: string
          cost?: number
          created_at?: string | null
          delivered_at?: string | null
          delivery_otp?: string | null
          delivery_photo?: string | null
          id?: string
          photos?: string[] | null
          picked_at?: string | null
          pickup_otp?: string | null
          pickup_photo?: string | null
          receiver_name?: string
          receiver_phone?: string
          sender_id?: string
          status?: string | null
          trip_id?: string
          updated_at?: string | null
          weight?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "packages_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          gateway_name: string | null
          gateway_ref: string | null
          id: string
          notes: string | null
          package_id: string
          sender_id: string
          settled_at: string | null
          settled_to_traveller: boolean | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          gateway_name?: string | null
          gateway_ref?: string | null
          id?: string
          notes?: string | null
          package_id: string
          sender_id: string
          settled_at?: string | null
          settled_to_traveller?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          gateway_name?: string | null
          gateway_ref?: string | null
          id?: string
          notes?: string | null
          package_id?: string
          sender_id?: string
          settled_at?: string | null
          settled_to_traveller?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          kyc_docs: Json | null
          kyc_status: string | null
          phone: string
          rating: number | null
          rating_count: number | null
          roles: string[] | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          kyc_docs?: Json | null
          kyc_status?: string | null
          phone: string
          rating?: number | null
          rating_count?: number | null
          roles?: string[] | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          kyc_docs?: Json | null
          kyc_status?: string | null
          phone?: string
          rating?: number | null
          rating_count?: number | null
          roles?: string[] | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          arrival_date: string
          available_slots: number | null
          capacity: number | null
          created_at: string | null
          departure_date: string
          destination: string
          drop_location: string
          id: string
          meetup_location: string
          mode: string
          source: string
          status: string | null
          stay_duration: string | null
          transport_number: string | null
          traveller_id: string
          updated_at: string | null
        }
        Insert: {
          arrival_date: string
          available_slots?: number | null
          capacity?: number | null
          created_at?: string | null
          departure_date: string
          destination: string
          drop_location: string
          id?: string
          meetup_location: string
          mode: string
          source: string
          status?: string | null
          stay_duration?: string | null
          transport_number?: string | null
          traveller_id: string
          updated_at?: string | null
        }
        Update: {
          arrival_date?: string
          available_slots?: number | null
          capacity?: number | null
          created_at?: string | null
          departure_date?: string
          destination?: string
          drop_location?: string
          id?: string
          meetup_location?: string
          mode?: string
          source?: string
          status?: string | null
          stay_duration?: string | null
          transport_number?: string | null
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
      generate_otp: { Args: never; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
