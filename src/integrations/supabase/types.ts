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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      inmuebles: {
        Row: {
          agente_asignado: string | null
          area_m2: number | null
          banheiros: number | null
          ciudad: string
          codigo_inventario: string | null
          created_at: string
          direccion: string
          disponible: boolean
          id: string
          image_url: string | null
          precio: number
          proveedor: string
          quartos: number | null
          region: string
          tipo: Database["public"]["Enums"]["tipo_inmueble"]
          titulo: string | null
          updated_at: string
          url_externa: string | null
        }
        Insert: {
          agente_asignado?: string | null
          area_m2?: number | null
          banheiros?: number | null
          ciudad: string
          codigo_inventario?: string | null
          created_at?: string
          direccion: string
          disponible?: boolean
          id?: string
          image_url?: string | null
          precio: number
          proveedor: string
          quartos?: number | null
          region: string
          tipo: Database["public"]["Enums"]["tipo_inmueble"]
          titulo?: string | null
          updated_at?: string
          url_externa?: string | null
        }
        Update: {
          agente_asignado?: string | null
          area_m2?: number | null
          banheiros?: number | null
          ciudad?: string
          codigo_inventario?: string | null
          created_at?: string
          direccion?: string
          disponible?: boolean
          id?: string
          image_url?: string | null
          precio?: number
          proveedor?: string
          quartos?: number | null
          region?: string
          tipo?: Database["public"]["Enums"]["tipo_inmueble"]
          titulo?: string | null
          updated_at?: string
          url_externa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inmuebles_agente_asignado_fkey"
            columns: ["agente_asignado"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          id: string
          nombre: string
          role: Database["public"]["Enums"]["user_role"]
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email: string
          id: string
          nombre: string
          role?: Database["public"]["Enums"]["user_role"]
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          role?: Database["public"]["Enums"]["user_role"]
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reservas: {
        Row: {
          agente_id: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_reserva"]
          fecha_solicitud: string
          fecha_visita: string | null
          hora_visita: string | null
          id: string
          inmueble_id: string
          notas: string | null
          updated_at: string
        }
        Insert: {
          agente_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_reserva"]
          fecha_solicitud?: string
          fecha_visita?: string | null
          hora_visita?: string | null
          id?: string
          inmueble_id: string
          notas?: string | null
          updated_at?: string
        }
        Update: {
          agente_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_reserva"]
          fecha_solicitud?: string
          fecha_visita?: string | null
          hora_visita?: string | null
          id?: string
          inmueble_id?: string
          notas?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_inmueble_id_fkey"
            columns: ["inmueble_id"]
            isOneToOne: false
            referencedRelation: "inmuebles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      estado_reserva: "pendiente" | "confirmada" | "cancelada" | "completada"
      tipo_inmueble:
        | "apartamento"
        | "casa"
        | "local_comercial"
        | "terreno"
        | "oficina"
      user_role: "admin" | "agente"
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
    Enums: {
      estado_reserva: ["pendiente", "confirmada", "cancelada", "completada"],
      tipo_inmueble: [
        "apartamento",
        "casa",
        "local_comercial",
        "terreno",
        "oficina",
      ],
      user_role: ["admin", "agente"],
    },
  },
} as const
