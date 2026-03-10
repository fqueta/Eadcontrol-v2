import api from "@/lib/axios";

export interface CheckoutCourse {
  id: number;
  titulo: string;
  valor: number | string;
  parcelas?: number | string;
  valor_parcela?: number | string;
  imagem_url: string | null;
  descricao: string | null;
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

  processPayment: async (data: any): Promise<PaymentResponse> => {
    const response = await api.post("/public/checkout/pay", data);
    return response.data;
  },
};
