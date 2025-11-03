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
      admin_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      agent_assignment_tracking: {
        Row: {
          created_at: string | null
          id: string
          last_assigned_agent_id: string | null
          last_assignment_at: string | null
          region: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_assigned_agent_id?: string | null
          last_assignment_at?: string | null
          region: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_assigned_agent_id?: string | null
          last_assignment_at?: string | null
          region?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_assignment_tracking_last_assigned_agent_id_fkey"
            columns: ["last_assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          acepta_privacidad: boolean
          acompanante_aporte: number | null
          acompanante_nombre: string | null
          acompanante_relacion: string | null
          agente_asignado_id: string | null
          ciudad_interes: string | null
          compra_solo_acompanado: string | null
          comunidad_autonoma: string | null
          created_at: string
          deudas_actuales: number | null
          edad: number
          email: string
          en_fichero_morosidad: boolean
          entrada_disponible: number | null
          familia_numerosa: boolean | null
          id: string
          ingresos_mensuales: number
          lead_id: string | null
          menor_de_35: boolean | null
          nombre_completo: string
          processed: boolean
          qualificado: boolean
          razon_no_qualificado: string | null
          simulador_hipotecario_data: Json | null
          simulador_personal_data: Json | null
          situacion_laboral: string | null
          telefono: string
          tidycal_booking_id: string | null
          tidycal_link: string | null
          tidycal_scheduled: boolean | null
          updated_at: string
          valor_inmueble_deseado: number | null
          zona_interes: string | null
        }
        Insert: {
          acepta_privacidad?: boolean
          acompanante_aporte?: number | null
          acompanante_nombre?: string | null
          acompanante_relacion?: string | null
          agente_asignado_id?: string | null
          ciudad_interes?: string | null
          compra_solo_acompanado?: string | null
          comunidad_autonoma?: string | null
          created_at?: string
          deudas_actuales?: number | null
          edad: number
          email: string
          en_fichero_morosidad?: boolean
          entrada_disponible?: number | null
          familia_numerosa?: boolean | null
          id?: string
          ingresos_mensuales: number
          lead_id?: string | null
          menor_de_35?: boolean | null
          nombre_completo: string
          processed?: boolean
          qualificado?: boolean
          razon_no_qualificado?: string | null
          simulador_hipotecario_data?: Json | null
          simulador_personal_data?: Json | null
          situacion_laboral?: string | null
          telefono: string
          tidycal_booking_id?: string | null
          tidycal_link?: string | null
          tidycal_scheduled?: boolean | null
          updated_at?: string
          valor_inmueble_deseado?: number | null
          zona_interes?: string | null
        }
        Update: {
          acepta_privacidad?: boolean
          acompanante_aporte?: number | null
          acompanante_nombre?: string | null
          acompanante_relacion?: string | null
          agente_asignado_id?: string | null
          ciudad_interes?: string | null
          compra_solo_acompanado?: string | null
          comunidad_autonoma?: string | null
          created_at?: string
          deudas_actuales?: number | null
          edad?: number
          email?: string
          en_fichero_morosidad?: boolean
          entrada_disponible?: number | null
          familia_numerosa?: boolean | null
          id?: string
          ingresos_mensuales?: number
          lead_id?: string | null
          menor_de_35?: boolean | null
          nombre_completo?: string
          processed?: boolean
          qualificado?: boolean
          razon_no_qualificado?: string | null
          simulador_hipotecario_data?: Json | null
          simulador_personal_data?: Json | null
          situacion_laboral?: string | null
          telefono?: string
          tidycal_booking_id?: string | null
          tidycal_link?: string | null
          tidycal_scheduled?: boolean | null
          updated_at?: string
          valor_inmueble_deseado?: number | null
          zona_interes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_agente_asignado_id_fkey"
            columns: ["agente_asignado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
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
      lead_historico: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          lead_id: string
          notas: string | null
          stage_anterior: Database["public"]["Enums"]["lead_stage"] | null
          stage_nuevo: Database["public"]["Enums"]["lead_stage"]
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          lead_id: string
          notas?: string | null
          stage_anterior?: Database["public"]["Enums"]["lead_stage"] | null
          stage_nuevo: Database["public"]["Enums"]["lead_stage"]
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          lead_id?: string
          notas?: string | null
          stage_anterior?: Database["public"]["Enums"]["lead_stage"] | null
          stage_nuevo?: Database["public"]["Enums"]["lead_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_inmuebles: {
        Row: {
          created_at: string
          id: string
          inmueble_id: string
          lead_id: string
          vinculado_por: string
        }
        Insert: {
          created_at?: string
          id?: string
          inmueble_id: string
          lead_id: string
          vinculado_por: string
        }
        Update: {
          created_at?: string
          id?: string
          inmueble_id?: string
          lead_id?: string
          vinculado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_inmuebles_inmueble_id_fkey"
            columns: ["inmueble_id"]
            isOneToOne: false
            referencedRelation: "inmuebles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_inmuebles_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agente_asignado_id: string | null
          ciudad_interes: string | null
          created_at: string
          email: string
          id: string
          last_stage_change_at: string
          nombre_completo: string
          notas: string | null
          simulador_hipotecario_data: Json | null
          simulador_personal_data: Json | null
          source: Database["public"]["Enums"]["lead_source"]
          stage: Database["public"]["Enums"]["lead_stage"]
          telefono: string
          updated_at: string
          valor_inmueble_deseado: number | null
          zona_interes: string | null
        }
        Insert: {
          agente_asignado_id?: string | null
          ciudad_interes?: string | null
          created_at?: string
          email: string
          id?: string
          last_stage_change_at?: string
          nombre_completo: string
          notas?: string | null
          simulador_hipotecario_data?: Json | null
          simulador_personal_data?: Json | null
          source?: Database["public"]["Enums"]["lead_source"]
          stage?: Database["public"]["Enums"]["lead_stage"]
          telefono: string
          updated_at?: string
          valor_inmueble_deseado?: number | null
          zona_interes?: string | null
        }
        Update: {
          agente_asignado_id?: string | null
          ciudad_interes?: string | null
          created_at?: string
          email?: string
          id?: string
          last_stage_change_at?: string
          nombre_completo?: string
          notas?: string | null
          simulador_hipotecario_data?: Json | null
          simulador_personal_data?: Json | null
          source?: Database["public"]["Enums"]["lead_source"]
          stage?: Database["public"]["Enums"]["lead_stage"]
          telefono?: string
          updated_at?: string
          valor_inmueble_deseado?: number | null
          zona_interes?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          id: string
          nombre: string
          region_round_robin: string | null
          role: Database["public"]["Enums"]["user_role"]
          telefono: string | null
          tidycal_url: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email: string
          id: string
          nombre: string
          region_round_robin?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          telefono?: string | null
          tidycal_url?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          region_round_robin?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          telefono?: string | null
          tidycal_url?: string | null
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json | null
          status: string
          submission_id: string | null
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          status: string
          submission_id?: string | null
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          status?: string
          submission_id?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_agent_statistics: { Args: { agent_id: string }; Returns: Json }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      estado_reserva: "pendiente" | "confirmada" | "cancelada" | "completada"
      lead_source: "formulario_web" | "manual" | "tidycal_webhook"
      lead_stage:
        | "lead_cualificado"
        | "mensaje_whatsapp"
        | "primera_llamada"
        | "reunion_contrato"
        | "firma_pago"
        | "listo"
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
      lead_source: ["formulario_web", "manual", "tidycal_webhook"],
      lead_stage: [
        "lead_cualificado",
        "mensaje_whatsapp",
        "primera_llamada",
        "reunion_contrato",
        "firma_pago",
        "listo",
      ],
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
