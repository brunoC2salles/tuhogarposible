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
      _leads_stage_migration_backup: {
        Row: {
          id: string | null
          migrated_at: string | null
          old_stage: Database["public"]["Enums"]["lead_stage"] | null
        }
        Insert: {
          id?: string | null
          migrated_at?: string | null
          old_stage?: Database["public"]["Enums"]["lead_stage"] | null
        }
        Update: {
          id?: string | null
          migrated_at?: string | null
          old_stage?: Database["public"]["Enums"]["lead_stage"] | null
        }
        Relationships: []
      }
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
      agent_variable_costs: {
        Row: {
          agent_id: string
          amount: number
          created_at: string | null
          description: string
          id: string
          invoice_id: string | null
          paid_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string | null
          description: string
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_variable_costs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_variable_costs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "product_invoices"
            referencedColumns: ["id"]
          },
        ]
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
      lead_document_analysis: {
        Row: {
          analysis_input: Json | null
          analysis_provider: string
          bank_name: string | null
          confidence_score: number | null
          created_at: string
          error_message: string | null
          extracted_financials: Json | null
          file_path: string | null
          finished_at: string | null
          holder_dni: string | null
          holder_name: string | null
          iban: string | null
          id: string
          lead_id: string | null
          manual_review_required: boolean
          missing_months: Json | null
          monthly_income: number | null
          months_detected: number | null
          num_titulares: number
          period_start: string | null
          request_id: string | null
          result: Json | null
          status: string
          tipo: string
          updated_at: string
          viabilidade_sugerida: Json | null
        }
        Insert: {
          analysis_input?: Json | null
          analysis_provider?: string
          bank_name?: string | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          extracted_financials?: Json | null
          file_path?: string | null
          finished_at?: string | null
          holder_dni?: string | null
          holder_name?: string | null
          iban?: string | null
          id?: string
          lead_id?: string | null
          manual_review_required?: boolean
          missing_months?: Json | null
          monthly_income?: number | null
          months_detected?: number | null
          num_titulares?: number
          period_start?: string | null
          request_id?: string | null
          result?: Json | null
          status?: string
          tipo?: string
          updated_at?: string
          viabilidade_sugerida?: Json | null
        }
        Update: {
          analysis_input?: Json | null
          analysis_provider?: string
          bank_name?: string | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          extracted_financials?: Json | null
          file_path?: string | null
          finished_at?: string | null
          holder_dni?: string | null
          holder_name?: string | null
          iban?: string | null
          id?: string
          lead_id?: string | null
          manual_review_required?: boolean
          missing_months?: Json | null
          monthly_income?: number | null
          months_detected?: number | null
          num_titulares?: number
          period_start?: string | null
          request_id?: string | null
          result?: Json | null
          status?: string
          tipo?: string
          updated_at?: string
          viabilidade_sugerida?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_document_analysis_lead_id_fkey"
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
          compra_acompanado: boolean | null
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
          pareja_contrato_trabajo: boolean | null
          pareja_cuatro_modelos_trimestrales: boolean | null
          pareja_dni_nie_ambas_caras: boolean | null
          pareja_dni_pais_origen: boolean | null
          pareja_dos_ultimas_rentas_autonomo: boolean | null
          pareja_movimientos_bancarios_6_meses: boolean | null
          pareja_tres_ultimas_nominas: boolean | null
          pareja_ultima_renta: boolean | null
          pareja_vida_laboral: boolean | null
          tres_recibos_hipoteca: boolean | null
          tres_recibos_prestamos: boolean | null
          tres_ultimas_nominas: boolean | null
          ultima_renta: boolean | null
          updated_at: string | null
          vida_laboral: boolean | null
        }
        Insert: {
          arras_vivienda_no_bancaria?: boolean | null
          compra_acompanado?: boolean | null
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
          pareja_contrato_trabajo?: boolean | null
          pareja_cuatro_modelos_trimestrales?: boolean | null
          pareja_dni_nie_ambas_caras?: boolean | null
          pareja_dni_pais_origen?: boolean | null
          pareja_dos_ultimas_rentas_autonomo?: boolean | null
          pareja_movimientos_bancarios_6_meses?: boolean | null
          pareja_tres_ultimas_nominas?: boolean | null
          pareja_ultima_renta?: boolean | null
          pareja_vida_laboral?: boolean | null
          tres_recibos_hipoteca?: boolean | null
          tres_recibos_prestamos?: boolean | null
          tres_ultimas_nominas?: boolean | null
          ultima_renta?: boolean | null
          updated_at?: string | null
          vida_laboral?: boolean | null
        }
        Update: {
          arras_vivienda_no_bancaria?: boolean | null
          compra_acompanado?: boolean | null
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
          pareja_contrato_trabajo?: boolean | null
          pareja_cuatro_modelos_trimestrales?: boolean | null
          pareja_dni_nie_ambas_caras?: boolean | null
          pareja_dni_pais_origen?: boolean | null
          pareja_dos_ultimas_rentas_autonomo?: boolean | null
          pareja_movimientos_bancarios_6_meses?: boolean | null
          pareja_tres_ultimas_nominas?: boolean | null
          pareja_ultima_renta?: boolean | null
          pareja_vida_laboral?: boolean | null
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
      lead_document_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          lead_id: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          lead_id?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          lead_id?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_document_tokens_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
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
      lead_services: {
        Row: {
          beneficios: boolean | null
          client_address: string | null
          client_company_name: string | null
          client_dni_nif: string | null
          client_email: string | null
          comision_vivienda: boolean | null
          comision_vivienda_percent: number | null
          created_at: string | null
          credito: boolean | null
          credito_valor: number | null
          exclusivo: boolean | null
          hipoteca: boolean | null
          hipoteca_percent: number | null
          id: string
          inspeccion_tecnica: boolean | null
          iva_amount: number | null
          iva_incluido: boolean | null
          lead_id: string
          nota_simples: boolean | null
          property_price: number
          subtotal: number | null
          tasaciones: boolean | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          beneficios?: boolean | null
          client_address?: string | null
          client_company_name?: string | null
          client_dni_nif?: string | null
          client_email?: string | null
          comision_vivienda?: boolean | null
          comision_vivienda_percent?: number | null
          created_at?: string | null
          credito?: boolean | null
          credito_valor?: number | null
          exclusivo?: boolean | null
          hipoteca?: boolean | null
          hipoteca_percent?: number | null
          id?: string
          inspeccion_tecnica?: boolean | null
          iva_amount?: number | null
          iva_incluido?: boolean | null
          lead_id: string
          nota_simples?: boolean | null
          property_price?: number
          subtotal?: number | null
          tasaciones?: boolean | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          beneficios?: boolean | null
          client_address?: string | null
          client_company_name?: string | null
          client_dni_nif?: string | null
          client_email?: string | null
          comision_vivienda?: boolean | null
          comision_vivienda_percent?: number | null
          created_at?: string | null
          credito?: boolean | null
          credito_valor?: number | null
          exclusivo?: boolean | null
          hipoteca?: boolean | null
          hipoteca_percent?: number | null
          id?: string
          inspeccion_tecnica?: boolean | null
          iva_amount?: number | null
          iva_incluido?: boolean | null
          lead_id?: string
          nota_simples?: boolean | null
          property_price?: number
          subtotal?: number | null
          tasaciones?: boolean | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_services_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
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
          fecha_reunion: string | null
          hora_reunion: string | null
          hora_reunion_texto: string | null
          id: string
          last_stage_change_at: string
          nombre_completo: string
          notas: string | null
          reunion_datetime: string | null
          simulador_hipotecario_data: Json | null
          simulador_personal_data: Json | null
          source: Database["public"]["Enums"]["lead_source"]
          stage: Database["public"]["Enums"]["lead_stage"]
          telefono: string
          updated_at: string
          valor_inmueble_deseado: number | null
          zona_horaria_reunion: string | null
          zona_interes: string | null
        }
        Insert: {
          agente_asignado_id?: string | null
          ciudad_interes?: string | null
          created_at?: string
          email: string
          fecha_reunion?: string | null
          hora_reunion?: string | null
          hora_reunion_texto?: string | null
          id?: string
          last_stage_change_at?: string
          nombre_completo: string
          notas?: string | null
          reunion_datetime?: string | null
          simulador_hipotecario_data?: Json | null
          simulador_personal_data?: Json | null
          source?: Database["public"]["Enums"]["lead_source"]
          stage?: Database["public"]["Enums"]["lead_stage"]
          telefono: string
          updated_at?: string
          valor_inmueble_deseado?: number | null
          zona_horaria_reunion?: string | null
          zona_interes?: string | null
        }
        Update: {
          agente_asignado_id?: string | null
          ciudad_interes?: string | null
          created_at?: string
          email?: string
          fecha_reunion?: string | null
          hora_reunion?: string | null
          hora_reunion_texto?: string | null
          id?: string
          last_stage_change_at?: string
          nombre_completo?: string
          notas?: string | null
          reunion_datetime?: string | null
          simulador_hipotecario_data?: Json | null
          simulador_personal_data?: Json | null
          source?: Database["public"]["Enums"]["lead_source"]
          stage?: Database["public"]["Enums"]["lead_stage"]
          telefono?: string
          updated_at?: string
          valor_inmueble_deseado?: number | null
          zona_horaria_reunion?: string | null
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
          aplicar_iva: boolean | null
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
          descripcion_directa: string | null
          hipoteca: boolean | null
          hipoteca_percent: number | null
          id: string
          inspeccion_tecnica: boolean | null
          invoice_number: string
          iva_amount: number
          iva_incluido: boolean | null
          lead_id: string | null
          lead_name: string
          monto_directo: number | null
          net_company: number | null
          nota_simples: boolean | null
          paid_at: string | null
          payment_due_date: string | null
          pdf_path: string | null
          property_price: number | null
          service_costs: Json | null
          status: string | null
          subtotal: number
          tasaciones: boolean | null
          total: number
          total_service_cost: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          aplicar_iva?: boolean | null
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
          descripcion_directa?: string | null
          hipoteca?: boolean | null
          hipoteca_percent?: number | null
          id?: string
          inspeccion_tecnica?: boolean | null
          invoice_number: string
          iva_amount: number
          iva_incluido?: boolean | null
          lead_id?: string | null
          lead_name: string
          monto_directo?: number | null
          net_company?: number | null
          nota_simples?: boolean | null
          paid_at?: string | null
          payment_due_date?: string | null
          pdf_path?: string | null
          property_price?: number | null
          service_costs?: Json | null
          status?: string | null
          subtotal: number
          tasaciones?: boolean | null
          total: number
          total_service_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          aplicar_iva?: boolean | null
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
          descripcion_directa?: string | null
          hipoteca?: boolean | null
          hipoteca_percent?: number | null
          id?: string
          inspeccion_tecnica?: boolean | null
          invoice_number?: string
          iva_amount?: number
          iva_incluido?: boolean | null
          lead_id?: string | null
          lead_name?: string
          monto_directo?: number | null
          net_company?: number | null
          nota_simples?: boolean | null
          paid_at?: string | null
          payment_due_date?: string | null
          pdf_path?: string | null
          property_price?: number | null
          service_costs?: Json | null
          status?: string | null
          subtotal?: number
          tasaciones?: boolean | null
          total?: number
          total_service_cost?: number | null
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
          disponibilidad: string[] | null
          dni_nie: string | null
          email: string
          id: string
          nombre: string
          region_round_robin: string[] | null
          role: Database["public"]["Enums"]["user_role"]
          telefono: string | null
          tidycal_url: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          comision_porcentaje?: number
          created_at?: string
          disponibilidad?: string[] | null
          dni_nie?: string | null
          email: string
          id: string
          nombre: string
          region_round_robin?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          telefono?: string | null
          tidycal_url?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          comision_porcentaje?: number
          created_at?: string
          disponibilidad?: string[] | null
          dni_nie?: string | null
          email?: string
          id?: string
          nombre?: string
          region_round_robin?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          telefono?: string | null
          tidycal_url?: string | null
          updated_at?: string
        }
        Relationships: []
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
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          status: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          status?: string
          webhook_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_document_token: { Args: never; Returns: string }
      get_agent_statistics: { Args: { agent_id: string }; Returns: Json }
      get_next_invoice_number: { Args: never; Returns: string }
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
      estado_reserva: "pendiente" | "confirmada" | "cancelada" | "completada"
      lead_source: "formulario_web" | "manual" | "tidycal_webhook" | "meta_ads"
      lead_stage:
        | "lead_cualificado"
        | "mensaje_whatsapp"
        | "primera_llamada"
        | "reunion_contrato"
        | "firma_pago"
        | "listo"
        | "preparacion_expediente"
        | "pretasacion"
        | "aprobacion_bancaria"
        | "tasacion"
        | "cobrar"
        | "recopilacion_expediente"
        | "mandamos_expediente"
        | "cobro"
        | "finalizada"
        | "no_cualificado"
        | "nuevo_lead"
        | "subida_expediente_bancos"
        | "descualificados"
        | "precualificacion"
      notification_type:
        | "new_lead"
        | "lead_stage_listo"
        | "payment_deadline"
        | "contract_signed"
        | "contract_generated"
        | "candidate_stage_change"
        | "new_message"
        | "document_analysis_completed"
      tipo_inmueble:
        | "apartamento"
        | "casa"
        | "local_comercial"
        | "terreno"
        | "oficina"
      user_role: "admin" | "agente" | "supervisor"
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
      lead_source: ["formulario_web", "manual", "tidycal_webhook", "meta_ads"],
      lead_stage: [
        "lead_cualificado",
        "mensaje_whatsapp",
        "primera_llamada",
        "reunion_contrato",
        "firma_pago",
        "listo",
        "preparacion_expediente",
        "pretasacion",
        "aprobacion_bancaria",
        "tasacion",
        "cobrar",
        "recopilacion_expediente",
        "mandamos_expediente",
        "cobro",
        "finalizada",
        "no_cualificado",
        "nuevo_lead",
        "subida_expediente_bancos",
        "descualificados",
        "precualificacion",
      ],
      notification_type: [
        "new_lead",
        "lead_stage_listo",
        "payment_deadline",
        "contract_signed",
        "contract_generated",
        "candidate_stage_change",
        "new_message",
        "document_analysis_completed",
      ],
      tipo_inmueble: [
        "apartamento",
        "casa",
        "local_comercial",
        "terreno",
        "oficina",
      ],
      user_role: ["admin", "agente", "supervisor"],
    },
  },
} as const
