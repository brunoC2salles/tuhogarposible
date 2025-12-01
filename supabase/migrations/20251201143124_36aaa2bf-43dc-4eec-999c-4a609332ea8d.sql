-- ============================================
-- PARTE 4: RLS POLICIES PARA CHAT
-- ============================================

-- RLS Policies - Apenas admin e agentes (NÃO supervisores)
CREATE POLICY "Admin and agentes can view channels"
ON chat_channels FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agente'));

CREATE POLICY "Admin can create channels"
ON chat_channels FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update channels"
ON chat_channels FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete channels"
ON chat_channels FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin and agentes can view channel members"
ON chat_channel_members FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agente'));

CREATE POLICY "Admin and agentes can join channels"
ON chat_channel_members FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agente'));

CREATE POLICY "Admin and agentes can leave channels"
ON chat_channel_members FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agente'));

CREATE POLICY "Admin and agentes can view messages"
ON chat_messages FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agente'))
  AND EXISTS (
    SELECT 1 FROM chat_channel_members
    WHERE channel_id = chat_messages.channel_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Admin and agentes can send messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'agente'))
  AND EXISTS (
    SELECT 1 FROM chat_channel_members
    WHERE channel_id = chat_messages.channel_id
    AND user_id = auth.uid()
  )
);