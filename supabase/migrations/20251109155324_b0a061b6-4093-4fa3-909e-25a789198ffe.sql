-- 1. Criar registro em user_roles para Bruno como admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('8c088d8b-156b-45a2-9559-9cb13cedfc22', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Atualizar profiles para consistência
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = '8c088d8b-156b-45a2-9559-9cb13cedfc22';

-- 3. Sincronizar TODOS os usuários existentes para prevenir futuros problemas
INSERT INTO public.user_roles (user_id, role)
SELECT id, role 
FROM public.profiles 
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;