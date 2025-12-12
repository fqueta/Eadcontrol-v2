import { z } from "zod";

/**
 * Schema de validação para formulário de ordem de serviço
 * Separado em arquivo próprio para evitar problemas com Fast Refresh
 */
export const serviceOrderSchema = z.object({
  doc_type: z.enum(["os", "orc"]),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  client_id: z.string().min(1, "Cliente é obrigatório"),
  aircraft_id: z.string().min(1, "Aeronave é obrigatória"),
  status: z.enum(["draft","pending", "in_progress", "completed", "cancelled","approved","on_hold"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  estimated_start_date: z.string().optional(),
  estimated_end_date: z.string().optional(),
  assigned_to: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  services: z.array(z.object({
    service_id: z.string(),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
    total_price: z.number().min(0),
    notes: z.string().optional()
  })).optional(),
  products: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
    total_price: z.number().min(0),
    notes: z.string().optional()
  })).optional()
});

export type ServiceOrderFormData = z.infer<typeof serviceOrderSchema>;