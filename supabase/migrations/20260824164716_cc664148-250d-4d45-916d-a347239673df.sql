INSERT INTO public.bitrix_dispatches (lead_id, agent_id, first_sent_at, last_sent_at, send_count, last_kind)
SELECT l.id, l.agente_asignado_id, MIN(w.created_at), MAX(w.created_at), COUNT(*)::int, 'backfill'
FROM public.webhook_logs w
JOIN public.leads l ON l.id = NULLIF(w.payload->>'lead_id','')::uuid
WHERE w.status = 'success' AND w.payload->>'lead_id' IS NOT NULL
GROUP BY l.id, l.agente_asignado_id
ON CONFLICT (lead_id) DO NOTHING;