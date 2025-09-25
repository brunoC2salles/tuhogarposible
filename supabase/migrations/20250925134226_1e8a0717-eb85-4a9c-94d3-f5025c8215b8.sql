-- Adicionar campo codigo_inventario à tabela inmuebles
ALTER TABLE public.inmuebles 
ADD COLUMN codigo_inventario TEXT;