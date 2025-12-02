-- Allow agents to delete their own contract links
CREATE POLICY "Agentes can delete their contract links"
ON public.public_contract_links
FOR DELETE
USING (
  agente_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::user_role)
);