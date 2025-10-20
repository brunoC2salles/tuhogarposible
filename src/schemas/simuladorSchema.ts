import { z } from 'zod';

export const simuladorCreditoSchema = z.object({
  nombreCompleto: z.string()
    .trim()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome muito longo'),
  
  edad: z.number()
    .min(18, 'Idade mínima: 18 anos')
    .max(55, 'Idade máxima: 55 anos'),
  
  ingresosMensuales: z.number()
    .min(1050, 'Ingresos mínimos: 1050€'),
  
  deudasActuales: z.number()
    .min(0, 'Deudas não pode ser negativo'),
  
  entrada: z.number()
    .min(0, 'Entrada não pode ser negativa'),
  
  valorInmueble: z.number()
    .min(1000, 'Valor do imóvel deve ser maior que 1000€'),
  
  plazoMeses: z.number()
    .int('Prazo deve ser inteiro')
    .min(60, 'Prazo mínimo: 60 meses (5 anos)')
    .max(144, 'Prazo máximo: 144 meses (12 anos)'),
  
  tasaAnual: z.number()
    .min(3, 'Taxa mínima: 3%')
    .max(12, 'Taxa máxima: 12%')
}).refine(data => data.entrada <= data.valorInmueble, {
  message: 'Entrada não pode ser maior que o valor do imóvel',
  path: ['entrada']
});

export type SimuladorCreditoFormData = z.infer<typeof simuladorCreditoSchema>;
