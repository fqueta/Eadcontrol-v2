import api from "@/lib/axios";

export interface CheckoutCourse {
  id: number;
  titulo: string;
  valor: number | string;
  parcelas?: number | string;
  valor_parcela?: number | string;
  imagem_url: string | null;
  descricao: string | null;
  config?: any;
}

export interface CouponResponse {
  valido: boolean;
  codigo: string;
  tipo: 'percentual' | 'fixo';
  valor_desconto: number;
  desconto_aplicado: number;
  valor_original: number;
  valor_final: number;
  mensagem: string;
  message?: string;
}

export interface PaymentResponse {
  success: boolean;
  payment: any;
  message?: string;
  errors?: any;
}

export const checkoutService = {
  getCourse: async (id: string): Promise<CheckoutCourse> => {
    const response = await api.get(`/public/checkout/course/${id}`);
    return response.data;
  },

  applyCoupon: async (codigo: string, course_id: number): Promise<CouponResponse> => {
    const response = await api.post("/public/checkout/apply-coupon", { codigo, course_id });
    return response.data;
  },

  processPayment: async (data: any): Promise<PaymentResponse> => {
    const response = await api.post("/public/checkout/pay", data);
    return response.data;
  },

  checkUser: async (data: { email?: string; cpfCnpj?: string }): Promise<{ exists: boolean }> => {
    const response = await api.post("/public/checkout/check-user", data);
    return response.data;
  },
};
