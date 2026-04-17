

# Plan: Integração Bewor Extractor — Análise de Documentos do Cliente

## Visão Geral

Adicionar fluxo onde o agente gera um **link público com branding** dentro do lead → cliente sobe **PDF de movimientos bancarios (6 meses)** → Bewor processa via OCR → resultado volta via webhook → sistema sugere viabilidade hipotecária (híbrido: cálculo automático + agente confirma).

## Arquitetura

```text
Agente (CRM) ──"Solicitar Documentos"──> gera token único
                                              │
                                              ▼
                            Cliente abre /documentos/{token} (público, com branding)
                                              │
                            ┌─────────────────┴─────────────────┐
                            ▼                                   ▼
                  Upload PDF (5MB max)                  edge fn: bewor-upload
                                                              │
                                                  POST Bewor /third-party/request
                                                  (file + webhook_url da nossa edge fn)
                                                              │
                                              Bewor processa (assíncrono)
                                                              │
                                                              ▼
                                              POST nossa edge fn: bewor-webhook
                                              (status FINISHED + metadata)
                                                              │
                                              GET resultado completo da Bewor
                                                              │
                                              Salvar em lead_document_analysis
                                              + executar simuladorUtils
                                              + notificar agente
```

## 1. Banco de Dados (1 migração)

**Tabela `lead_document_analysis`:**
- `id`, `lead_id` (FK leads), `request_id` (UUID Bewor), `tipo` ('movimientos_bancarios'), `status` ('CREATED'/'PROCESSING'/'FINISHED'/'ERROR'), `file_path` (storage), `result` (jsonb com dados OCR), `viabilidade_sugerida` (jsonb: aprobable, ingresos_detectados, hipoteca_max, razon), `created_at`, `finished_at`
- RLS: agentes veem da própria carteira, admins/supervisores veem tudo

**Tabela `lead_document_tokens`:**
- `id`, `lead_id`, `token` (random 32 chars, único), `expires_at` (7 dias), `used_at` (nullable), `created_at`, `created_by`
- RLS: público só pode `SELECT` por token (RLS policy específica que valida expires_at), agentes criam para seus leads

**Bucket storage:** reutilizar `lead-documents` existente (subpath `bewor/{lead_id}/{request_id}.pdf`)

## 2. Secrets a configurar

- `BEWOR_BASE_URL` = `https://extractor.bewor.tech`
- `BEWOR_EMAIL` = (fornecido)
- `BEWOR_PASSWORD` = (fornecido)
- `BEWOR_THIRD_PARTY_JWT` = gerado uma vez via edge fn admin (ver §3)
- `BEWOR_WEBHOOK_SECRET` = string aleatória própria, usada para validar callbacks

## 3. Edge Functions (4 novas, todas com `verify_jwt = false` exceto admin)

| Função | Propósito | Auth |
|---|---|---|
| `bewor-admin-token` | Admin-only. Faz login na Bewor (email/senha) → cria token third-party → guarda em secret. Roda 1x. | Validar role admin via JWT |
| `bewor-public-upload` | Recebe PDF do cliente via token público, valida token+expiração, faz upload para Storage, chama Bewor `/third-party/request` com `webhook_url` apontando para nossa `bewor-webhook?secret=...` | Pública, valida token de lead |
| `bewor-webhook` | Recebe callback da Bewor (FINISHED). Valida `secret` query param. Faz GET no resultado completo, salva em `lead_document_analysis`, calcula viabilidade via lógica de simulador, notifica agente | Pública (webhook) |
| `bewor-get-token-info` | Endpoint público que retorna info mínima do lead (só nome do cliente + branding) para a página pública renderizar | Pública, valida token |

**Importante:** Bewor tem 5MB max e só PDF — validar client-side e edge function.

## 4. Frontend

### Página pública nova: `/documentos/:token`
- Layout com Logo da Tu Hogar Posible (já existe em `Logo.tsx`)
- Saudação personalizada ("Hola {nome}")
- Texto explicativo: "Sube tus movimientos bancarios de los últimos 6 meses (PDF, máx 5MB)"
- Componente upload com validação
- Estado de envio + confirmação ("Recibido, te contactaremos en breve")
- Sem auth necessária

### Modal CRM: `RequestDocumentsModal.tsx`
- Botão "Solicitar Documentos" no `LeadDetailsModal` (aba Documentos)
- Ao clicar: gera token, mostra link copiável + botões WhatsApp/Email pré-preenchidos
- Lista análises anteriores do lead com status

### Aba "Análisis Bewor" no LeadDetailsModal
- Mostra histórico de uploads e seus status
- Quando `FINISHED`: card com dados extraídos (ingresos médios, deudas detectadas) + **veredicto sugerido** + botão "Aplicar al simulador del lead" / "Ignorar sugerencia"
- Hook novo: `useLeadDocumentAnalysis(leadId)` com realtime para atualizar quando webhook chegar

## 5. Lógica Híbrida de Viabilidade

Na `bewor-webhook`, ao receber resultado:
1. Extrair `ingresos_mensuales_promedio` e `deudas_mensuales` do JSON OCR
2. Rodar regras já existentes (35% DTI, caps 180k/210k de `simuladorUtils.ts` — replicar lógica em TS na edge function)
3. Salvar `viabilidade_sugerida` com: `{aprobable: bool, hipoteca_maxima: number, cuota_max: number, razon: string}`
4. Criar notificação para o agente: "Análisis de documentos completado para {lead}"
5. Agente vê na UI e decide aplicar ou ajustar manualmente

## 6. Performance & Segurança

- Token público com expiração 7 dias + uso único opcional
- Webhook valida `secret` em query string para evitar callbacks falsos
- RLS estrita em `lead_document_analysis` e `lead_document_tokens`
- Validação client+server: tipo PDF, tamanho ≤5MB
- Não bloqueia UI: upload assíncrono, agente é notificado quando terminar

## Arquivos modificados/criados

**Novos:**
- `supabase/migrations/<ts>_bewor_integration.sql`
- `supabase/functions/bewor-admin-token/index.ts`
- `supabase/functions/bewor-public-upload/index.ts`
- `supabase/functions/bewor-webhook/index.ts`
- `supabase/functions/bewor-get-token-info/index.ts`
- `src/pages/PublicDocumentUpload.tsx` (rota `/documentos/:token`)
- `src/components/crm/RequestDocumentsModal.tsx`
- `src/components/crm/BeworAnalysisTab.tsx`
- `src/hooks/useLeadDocumentAnalysis.ts`
- `src/hooks/useLeadDocumentTokens.ts`

**Editados (mínimo):**
- `src/App.tsx` — rota pública `/documentos/:token`
- `src/components/crm/LeadDetailsModal.tsx` — botão + nova aba
- `supabase/config.toml` — registrar 4 edge functions com `verify_jwt = false`

## Ordem de implementação

1. Migração DB + secrets
2. Edge function `bewor-admin-token` (rodar 1x para gerar JWT)
3. Edge functions `bewor-public-upload`, `bewor-webhook`, `bewor-get-token-info`
4. Página pública `/documentos/:token`
5. Modal "Solicitar Documentos" + aba "Análisis Bewor" no CRM
6. Teste end-to-end com PDF real

