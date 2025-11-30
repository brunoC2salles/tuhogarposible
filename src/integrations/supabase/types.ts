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
      agent_candidate_documents: {
        Row: {
          candidate_id: string
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_candidate_documents_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "agent_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_candidates: {
        Row: {
          ciudad: string | null
          created_at: string | null
          created_by: string | null
          dni: string | null
          email: string
          id: string
          last_stage_change_at: string | null
          nombre_completo: string
          notas: string | null
          stage: Database["public"]["Enums"]["agent_candidate_stage"]
          telefono: string
          updated_at: string | null
        }
        Insert: {
          ciudad?: string | null
          created_at?: string | null
          created_by?: string | null
          dni?: string | null
          email: string
          id?: string
          last_stage_change_at?: string | null
          nombre_completo: string
          notas?: string | null
          stage?: Database["public"]["Enums"]["agent_candidate_stage"]
          telefono: string
          updated_at?: string | null
        }
        Update: {
          ciudad?: string | null
          created_at?: string | null
          created_by?: string | null
          dni?: string | null
          email?: string
          id?: string
          last_stage_change_at?: string | null
          nombre_completo?: string
          notas?: string | null
          stage?: Database["public"]["Enums"]["agent_candidate_stage"]
          telefono?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          activo: boolean | null
          campos_formulario: Json
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          template_content: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          campos_formulario?: Json
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          template_content: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          campos_formulario?: Json
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          template_content?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      despesas_operacionais: {
        Row: {
          agente_id: string | null
          categoria: string
          comprovante_url: string | null
          created_at: string | null
          created_by: string | null
          data_despesa: string
          descricao: string
          id: string
          metodo_pagamento: string | null
          notas: string | null
          updated_at: string | null
          valor: number
        }
        Insert: {
          agente_id?: string | null
          categoria: string
          comprovante_url?: string | null
          created_at?: string | null
          created_by?: string | null
          data_despesa: string
          descricao: string
          id?: string
          metodo_pagamento?: string | null
          notas?: string | null
          updated_at?: string | null
          valor: number
        }
        Update: {
          agente_id?: string | null
          categoria?: string
          comprovante_url?: string | null
          created_at?: string | null
          created_by?: string | null
          data_despesa?: string
          descricao?: string
          id?: string
          metodo_pagamento?: string | null
          notas?: string | null
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_operacionais_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          activo: boolean | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          tipo: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      faturacoes: {
        Row: {
          agente_id: string | null
          arquivo_fatura_url: string | null
          cliente_nome: string | null
          created_at: string | null
          created_by: string | null
          data_faturacao: string
          descricao: string
          id: string
          lead_id: string | null
          notas: string | null
          numero_fatura: string | null
          status: string | null
          updated_at: string | null
          valor: number
        }
        Insert: {
          agente_id?: string | null
          arquivo_fatura_url?: string | null
          cliente_nome?: string | null
          created_at?: string | null
          created_by?: string | null
          data_faturacao: string
          descricao: string
          id?: string
          lead_id?: string | null
          notas?: string | null
          numero_fatura?: string | null
          status?: string | null
          updated_at?: string | null
          valor: number
        }
        Update: {
          agente_id?: string | null
          arquivo_fatura_url?: string | null
          cliente_nome?: string | null
          created_at?: string | null
          created_by?: string | null
          data_faturacao?: string
          descricao?: string
          id?: string
          lead_id?: string | null
          notas?: string | null
          numero_fatura?: string | null
          status?: string | null
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturacoes_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      form_partial_submissions: {
        Row: {
          abandoned: boolean | null
          abandoned_at: string | null
          automation_triggered: boolean | null
          automation_triggered_at: string | null
          created_at: string | null
          email: string | null
          form_data: Json | null
          id: string
          nombre_completo: string | null
          recovered: boolean | null
          session_id: string
          step_reached: number | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          abandoned?: boolean | null
          abandoned_at?: string | null
          automation_triggered?: boolean | null
          automation_triggered_at?: string | null
          created_at?: string | null
          email?: string | null
          form_data?: Json | null
          id?: string
          nombre_completo?: string | null
          recovered?: boolean | null
          session_id: string
          step_reached?: number | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          abandoned?: boolean | null
          abandoned_at?: string | null
          automation_triggered?: boolean | null
          automation_triggered_at?: string | null
          created_at?: string | null
          email?: string | null
          form_data?: Json | null
          id?: string
          nombre_completo?: string | null
          recovered?: boolean | null
          session_id?: string
          step_reached?: number | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      generated_contracts: {
        Row: {
          datos_contrato: Json
          file_path: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          inmueble_id: string | null
          lead_id: string | null
          notas: string | null
          signature_status: string | null
          signature_submission_id: string | null
          signed_at: string | null
          signed_file_path: string | null
          tipo_contrato: string
        }
        Insert: {
          datos_contrato: Json
          file_path?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          inmueble_id?: string | null
          lead_id?: string | null
          notas?: string | null
          signature_status?: string | null
          signature_submission_id?: string | null
          signed_at?: string | null
          signed_file_path?: string | null
          tipo_contrato: string
        }
        Update: {
          datos_contrato?: Json
          file_path?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          inmueble_id?: string | null
          lead_id?: string | null
          notas?: string | null
          signature_status?: string | null
          signature_submission_id?: string | null
          signed_at?: string | null
          signed_file_path?: string | null
          tipo_contrato?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_contracts_inmueble_id_fkey"
            columns: ["inmueble_id"]
            isOneToOne: false
            referencedRelation: "inmuebles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_contracts_lead_id_fkey"
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
          images: Json | null
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
          images?: Json | null
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
          images?: Json | null
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
      lead_comments: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          comentario: string
          created_at: string | null
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          comentario: string
          created_at?: string | null
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          comentario?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_document_checklist: {
        Row: {
          arras_vivienda_no_bancaria: boolean | null
          contrato_trabajo: boolean | null
          created_at: string | null
          cuadro_amortizacion_hipoteca: boolean | null
          cuadro_amortizacion_prestamos: boolean | null
          cuatro_modelos_trimestrales: boolean | null
          dni_nie_ambas_caras: boolean | null
          dni_pais_origen: boolean | null
          dos_ultimas_rentas_autonomo: boolean | null
          fotos_vivienda: boolean | null
          id: string
          justificante_deuda_saldada: boolean | null
          lead_id: string
          movimientos_bancarios_6_meses: boolean | null
          nota_simple: boolean | null
          tres_recibos_hipoteca: boolean | null
          tres_recibos_prestamos: boolean | null
          tres_ultimas_nominas: boolean | null
          ultima_renta: boolean | null
          updated_at: string | null
          vida_laboral: boolean | null
        }
        Insert: {
          arras_vivienda_no_bancaria?: boolean | null
          contrato_trabajo?: boolean | null
          created_at?: string | null
          cuadro_amortizacion_hipoteca?: boolean | null
          cuadro_amortizacion_prestamos?: boolean | null
          cuatro_modelos_trimestrales?: boolean | null
          dni_nie_ambas_caras?: boolean | null
          dni_pais_origen?: boolean | null
          dos_ultimas_rentas_autonomo?: boolean | null
          fotos_vivienda?: boolean | null
          id?: string
          justificante_deuda_saldada?: boolean | null
          lead_id: string
          movimientos_bancarios_6_meses?: boolean | null
          nota_simple?: boolean | null
          tres_recibos_hipoteca?: boolean | null
          tres_recibos_prestamos?: boolean | null
          tres_ultimas_nominas?: boolean | null
          ultima_renta?: boolean | null
          updated_at?: string | null
          vida_laboral?: boolean | null
        }
        Update: {
          arras_vivienda_no_bancaria?: boolean | null
          contrato_trabajo?: boolean | null
          created_at?: string | null
          cuadro_amortizacion_hipoteca?: boolean | null
          cuadro_amortizacion_prestamos?: boolean | null
          cuatro_modelos_trimestrales?: boolean | null
          dni_nie_ambas_caras?: boolean | null
          dni_pais_origen?: boolean | null
          dos_ultimas_rentas_autonomo?: boolean | null
          fotos_vivienda?: boolean | null
          id?: string
          justificante_deuda_saldada?: boolean | null
          lead_id?: string
          movimientos_bancarios_6_meses?: boolean | null
          nota_simple?: boolean | null
          tres_recibos_hipoteca?: boolean | null
          tres_recibos_prestamos?: boolean | null
          tres_ultimas_nominas?: boolean | null
          ultima_renta?: boolean | null
          updated_at?: string | null
          vida_laboral?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_document_checklist_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_external_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          lead_id: string
          titulo: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id: string
          titulo?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string
          titulo?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_external_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_external_links_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
        Relationships: [
          {
            foreignKeyName: "fk_leads_agente_asignado"
            columns: ["agente_asignado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      product_invoices: {
        Row: {
          agent_id: string | null
          beneficios: boolean | null
          client_address: string
          client_company_name: string
          client_dni_nif: string
          client_email: string
          comision_vivienda: boolean | null
          comision_vivienda_percent: number | null
          created_at: string | null
          created_by: string | null
          credito: boolean | null
          credito_valor: number | null
          hipoteca: boolean | null
          hipoteca_percent: number | null
          id: string
          inspeccion_tecnica: boolean | null
          invoice_number: string
          iva_amount: number
          iva_incluido: boolean | null
          lead_id: string | null
          lead_name: string
          nota_simples: boolean | null
          paid_at: string | null
          payment_due_date: string | null
          pdf_path: string | null
          property_price: number
          status: string | null
          subtotal: number
          tasaciones: boolean | null
          total: number
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          beneficios?: boolean | null
          client_address: string
          client_company_name: string
          client_dni_nif: string
          client_email: string
          comision_vivienda?: boolean | null
          comision_vivienda_percent?: number | null
          created_at?: string | null
          created_by?: string | null
          credito?: boolean | null
          credito_valor?: number | null
          hipoteca?: boolean | null
          hipoteca_percent?: number | null
          id?: string
          inspeccion_tecnica?: boolean | null
          invoice_number: string
          iva_amount: number
          iva_incluido?: boolean | null
          lead_id?: string | null
          lead_name: string
          nota_simples?: boolean | null
          paid_at?: string | null
          payment_due_date?: string | null
          pdf_path?: string | null
          property_price: number
          status?: string | null
          subtotal: number
          tasaciones?: boolean | null
          total: number
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          beneficios?: boolean | null
          client_address?: string
          client_company_name?: string
          client_dni_nif?: string
          client_email?: string
          comision_vivienda?: boolean | null
          comision_vivienda_percent?: number | null
          created_at?: string | null
          created_by?: string | null
          credito?: boolean | null
          credito_valor?: number | null
          hipoteca?: boolean | null
          hipoteca_percent?: number | null
          id?: string
          inspeccion_tecnica?: boolean | null
          invoice_number?: string
          iva_amount?: number
          iva_incluido?: boolean | null
          lead_id?: string | null
          lead_name?: string
          nota_simples?: boolean | null
          paid_at?: string | null
          payment_due_date?: string | null
          pdf_path?: string | null
          property_price?: number
          status?: string | null
          subtotal?: number
          tasaciones?: boolean | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_invoices_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_invoices_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          comision_porcentaje: number
          created_at: string
          dni_nie: string | null
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
          comision_porcentaje?: number
          created_at?: string
          dni_nie?: string | null
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
          comision_porcentaje?: number
          created_at?: string
          dni_nie?: string | null
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
      public_contract_links: {
        Row: {
          agente_id: string
          completed_at: string | null
          contract_generated_id: string | null
          created_at: string | null
          datos_completados: Json | null
          expires_at: string
          id: string
          lead_id: string
          status: string | null
          template_id: string
          token: string
        }
        Insert: {
          agente_id: string
          completed_at?: string | null
          contract_generated_id?: string | null
          created_at?: string | null
          datos_completados?: Json | null
          expires_at: string
          id?: string
          lead_id: string
          status?: string | null
          template_id: string
          token: string
        }
        Update: {
          agente_id?: string
          completed_at?: string | null
          contract_generated_id?: string | null
          created_at?: string | null
          datos_completados?: Json | null
          expires_at?: string
          id?: string
          lead_id?: string
          status?: string | null
          template_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_contract_links_contract_generated_id_fkey"
            columns: ["contract_generated_id"]
            isOneToOne: false
            referencedRelation: "generated_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_contract_links_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_contract_links_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
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
      scraping_progress: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          id: string
          images_found: number | null
          inmueble_id: string | null
          last_attempt_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          images_found?: number | null
          inmueble_id?: string | null
          last_attempt_at?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          images_found?: number | null
          inmueble_id?: string | null
          last_attempt_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scraping_progress_inmueble_id_fkey"
            columns: ["inmueble_id"]
            isOneToOne: true
            referencedRelation: "inmuebles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_videos: {
        Row: {
          activo: boolean | null
          categoria: string
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          duracion_minutos: number | null
          id: string
          orden: number | null
          titulo: string
          updated_at: string | null
          url_embed: string
        }
        Insert: {
          activo?: boolean | null
          categoria: string
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          duracion_minutos?: number | null
          id?: string
          orden?: number | null
          titulo: string
          updated_at?: string | null
          url_embed: string
        }
        Update: {
          activo?: boolean | null
          categoria?: string
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          duracion_minutos?: number | null
          id?: string
          orden?: number | null
          titulo?: string
          updated_at?: string | null
          url_embed?: string
        }
        Relationships: []
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
      get_next_invoice_number: { Args: never; Returns: string }
      get_protected_inmuebles: {
        Args: { provider: string }
        Returns: {
          inmueble_id: string
        }[]
      }
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
      notify_admins: {
        Args: {
          p_link?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: undefined
      }
    }
    Enums: {
      agent_candidate_stage:
        | "nuevo_contacto"
        | "mensaje_whatsapp"
        | "primera_reunion"
        | "segunda_reunion_presentacion"
        | "reunion_dudas_albert"
        | "dudas_contrato"
        | "pago"
        | "rellenar_perfil"
        | "cerrado"
      estado_reserva: "pendiente" | "confirmada" | "cancelada" | "completada"
      lead_source: "formulario_web" | "manual" | "tidycal_webhook"
      lead_stage:
        | "lead_cualificado"
        | "mensaje_whatsapp"
        | "primera_llamada"
        | "reunion_contrato"
        | "firma_pago"
        | "listo"
      notification_type:
        | "new_lead"
        | "lead_stage_listo"
        | "payment_deadline"
        | "contract_signed"
        | "contract_generated"
        | "candidate_stage_change"
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
      agent_candidate_stage: [
        "nuevo_contacto",
        "mensaje_whatsapp",
        "primera_reunion",
        "segunda_reunion_presentacion",
        "reunion_dudas_albert",
        "dudas_contrato",
        "pago",
        "rellenar_perfil",
        "cerrado",
      ],
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
      notification_type: [
        "new_lead",
        "lead_stage_listo",
        "payment_deadline",
        "contract_signed",
        "contract_generated",
        "candidate_stage_change",
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
