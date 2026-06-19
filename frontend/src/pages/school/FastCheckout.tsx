import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, CreditCard, QrCode, FileText, Lock, ShieldCheck, Star, ShoppingBag, Info, MapPin, Tag, X, Loader2, Sparkles, TrendingDown, Gift, FileCheck, ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { checkoutService, CouponResponse } from "@/services/checkoutService";
import { useToast } from "@/components/ui/use-toast";
import InclusiveSiteLayout from "@/components/layout/InclusiveSiteLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { phoneApplyMask } from "@/lib/masks/phone-apply-mask";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Form Validation Schema
const checkoutSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  cpfCnpj: z.string().min(14, "Documento inválido"), // 000.000.000-00
  phone: z.string().min(10, "Telefone inválido"),
  payment_method: z.enum(["credit_card", "pix", "boleto"]),
  installmentCount: z.coerce.number().optional(),
  credit_card: z.object({
    holderName: z.string().optional(),
    number: z.string().optional(),
    expiryMonth: z.string().optional(),
    expiryYear: z.string().optional(),
    ccv: z.string().optional(),
    postalCode: z.string().optional(),
    addressNumber: z.string().optional(),
    addressComplement: z.string().optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.payment_method === 'credit_card') {
    const cc = data.credit_card;
    if (!cc?.number) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número do cartão obrigatório", path: ["credit_card", "number"] });
    }
    if (!cc?.holderName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome impresso obrigatório", path: ["credit_card", "holderName"] });
    }
    if (!cc?.expiryMonth || !/^(0[1-9]|1[0-2])$/.test(cc.expiryMonth)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mês inválido", path: ["credit_card", "expiryMonth"] });
    }
    if (!cc?.expiryYear || !/^\d{2}$/.test(cc.expiryYear)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ano inválido", path: ["credit_card", "expiryYear"] });
    } else {
      const currentYear = new Date().getFullYear() % 100;
      if (parseInt(cc.expiryYear, 10) < currentYear) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ano expirado", path: ["credit_card", "expiryYear"] });
      }
    }
    if (!cc?.ccv || cc.ccv.length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CVV obrigatório", path: ["credit_card", "ccv"] });
    }
    if (!cc?.postalCode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CEP obrigatório", path: ["credit_card", "postalCode"] });
    }
    if (!cc?.addressNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número obrigatório", path: ["credit_card", "addressNumber"] });
    }
  }
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

// Masking functions
const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{3})\d+?$/, "$1");
};

const maskMonth = (value: string) => {
  let clean = value.replace(/\D/g, "");
  if (clean.length === 2) {
    const month = parseInt(clean, 10);
    if (month < 1) clean = "01";
    if (month > 12) clean = "12";
  }
  return clean;
};

const maskYear = (value: string) => {
  return value.replace(/\D/g, "");
};

const maskCardNumber = (value: string) => {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{4})(\d)/, "$1 $2")
    .replace(/(\d{4})(\d)/, "$1 $2")
    .replace(/(\d{4})(\d)/, "$1 $2")
    .replace(/(\d{4})\d+?$/, "$1");
};

const FastCheckout = () => {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { loginWithResponse, user } = useAuth();

  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ["checkout", "course", courseSlug],
    queryFn: () => checkoutService.getCourse(courseSlug!),
    enabled: !!courseSlug,
  });
  const [paymentResult, setPaymentResult] = useState<any>(location.state?.paymentResult || null);
  const isSuccess = location.pathname.endsWith('/obrigado-pela-compra');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [duplicateField, setDuplicateField] = useState<'email' | 'cpfCnpj' | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponResponse | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const couponDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const couponInputRef = useRef<HTMLInputElement>(null);

  const doApplyCoupon = useCallback(async (code: string) => {
    if (!code.trim() || !course?.id) return;
    setCouponLoading(true);
    setCouponError("");
    setCouponResult(null);
    try {
      const result = await checkoutService.applyCoupon(code.trim(), course.id);
      setCouponResult(result);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Cupom inválido ou expirado.";
      setCouponError(msg);
      setCouponResult(null);
    } finally {
      setCouponLoading(false);
    }
  }, [course?.id]);

  const handleCouponChange = (value: string) => {
    const upper = value.toUpperCase();
    setCouponCode(upper);
    setCouponError("");
    if (couponDebounceRef.current) clearTimeout(couponDebounceRef.current);
    if (upper.trim().length >= 3) {
      couponDebounceRef.current = setTimeout(() => doApplyCoupon(upper), 600);
    }
  };

  useEffect(() => {
    return () => {
      if (couponDebounceRef.current) clearTimeout(couponDebounceRef.current);
    };
  }, []);

  // Auto-apply coupon from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlCupom = params.get('cupom');
    if (urlCupom && course?.id && !couponResult && !couponLoading && !couponError) {
      setCouponCode(urlCupom.toUpperCase());
      doApplyCoupon(urlCupom.toUpperCase());
    }
  }, [location.search, course?.id, doApplyCoupon, couponResult, couponLoading, couponError]);


  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      payment_method: "credit_card",
      installmentCount: 1,
    },
  });

  React.useEffect(() => {
    if (user) {
      form.setValue("name", user.name || "");
      form.setValue("email", user.email || "");
      const cpfToMask = user.cpf || (user as any).cnpj || "";
      form.setValue("cpfCnpj", cpfToMask ? maskCPF(cpfToMask) : "");
      if (user.celular) form.setValue("phone", user.celular);
    }
  }, [user, form]);

  const handleCheckUser = async (field: 'email' | 'cpfCnpj', value: string) => {
    if (user) return; 
    if (!value || value.length < 5) return;
    try {
      const { exists } = await checkoutService.checkUser({ [field]: value });
      if (exists) {
        setDuplicateField(field);
        setShowLoginPrompt(true);
      }
    } catch (err) {
      console.error("Check user error", err);
    }
  };

  const handleCancelPrompt = () => {
    setShowLoginPrompt(false);
    if (duplicateField) {
      setTimeout(() => {
        const element = document.getElementById(duplicateField);
        if (element) {
          element.focus();
        }
      }, 50);
    }
  };

  const handleApplyCoupon = async () => {
    if (couponDebounceRef.current) clearTimeout(couponDebounceRef.current);
    await doApplyCoupon(couponCode);
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponResult(null);
    setCouponError("");
    if (couponInputRef.current) couponInputRef.current.focus();
  };

  const courseInscricao = course?.inscricao ? Number(course.inscricao) : 0;
  const courseValorTotal = (course?.valor ? Number(course.valor) : 0) + courseInscricao;
  const displayPrice = couponResult ? couponResult.valor_final : courseValorTotal;

  const maxInstallments = course?.parcelas ? Number(course.parcelas) : 1;
  const showAllInstallments = course?.config?.incluir_opcao_cartao_parcelas === 's';

  const installmentOptions = React.useMemo(() => {
      if (maxInstallments <= 1) {
          return [1];
      }
      if (showAllInstallments) {
          return Array.from({ length: maxInstallments }, (_, i) => i + 1);
      }
      return [1, maxInstallments];
  }, [maxInstallments, showAllInstallments]);

  const getInstallmentLabel = (count: number) => {
      const valuePerInstallment = displayPrice / count;
      return `${String(count).padStart(2, '0')}x de R$ ${valuePerInstallment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Sem Juros)`;
  };

  const paymentMethod = form.watch("payment_method");

  const mutation = useMutation({
    mutationFn: (data: CheckoutValues) => {
        const payload: any = {
            ...data,
            course_id: course?.id,
            cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
            phone: data.phone.replace(/\D/g, ''),
            installmentCount: data.installmentCount || 1,
        };

        if (couponResult?.valido) {
            payload.coupon_code = couponResult.codigo;
        }

        if (data.payment_method === 'credit_card' && data.credit_card) {
            payload.credit_card = {
                ...data.credit_card,
                number: data.credit_card.number?.replace(/\D/g, ''),
                postalCode: data.credit_card.postalCode?.replace(/\D/g, ''),
            };
            
            payload.credit_card_holder = {
                name: data.credit_card.holderName || data.name,
                email: data.email,
                cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
                phone: data.phone.replace(/\D/g, ''),
                postalCode: data.credit_card.postalCode?.replace(/\D/g, ''),
                addressNumber: data.credit_card.addressNumber,
                addressComplement: data.credit_card.addressComplement,
            };
        }

        return checkoutService.processPayment(payload);
    },
    onSuccess: async (data: any) => {
      setPaymentResult(data.payment);
      
      toast({
        title: "Sucesso!",
        description: "Pedido processado com sucesso.",
      });

      // Se tiver resposta de auth, logar silenciosamente
      if (data.auth_response) {
          await loginWithResponse(data.auth_response);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
      navigate(`/checkout/${courseSlug}/obrigado-pela-compra`, { 
          state: { paymentResult: data.payment } 
      });
    },
    onError: (error: any) => {
      console.error("Payment Error:", error.response?.data);
      toast({
        variant: "destructive",
        title: "Erro no pagamento",
        description: error.response?.data?.message || error.response?.data?.errors?.credit_card_holder?.[0] || "Ocorreu um erro ao processar seu pagamento.",
      });
    },
  });
  const onSubmit = (data: CheckoutValues) => {
    mutation.mutate(data);
  };

  if (isCourseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isSuccess) {
    return (
        <InclusiveSiteLayout>
            <div className="bg-[#F8FAFC] dark:bg-slate-950/20 py-20 min-h-screen flex items-start justify-center px-4">
                <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 animate-in zoom-in-95 duration-700 overflow-hidden w-full max-w-2xl">
                  <div className="h-2 w-full bg-green-500" />
                  <CardContent className="pt-16 pb-16 flex flex-col items-center text-center space-y-8">
                    <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center animate-in zoom-in duration-1000">
                      <Check className="w-12 h-12 stroke-[4]" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Obrigado pela compra!</h2>
                      <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-3 font-medium text-lg leading-relaxed">
                        {(paymentResult?.payment?.billingType === "PIX" || paymentResult?.payment?.billingType === "BOLETO")
                          ? "Seu pedido foi registrado! Aguarde a confirmação do pagamento para ter acesso ao curso."
                          : "Seu pedido foi registrado com sucesso. Verifique seu e-mail para os próximos passos."}
                      </p>
                    </div>

                    {(paymentResult?.payment?.billingType === "PIX" || paymentResult?.payment?.billingType === "BOLETO") && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl text-left max-w-sm w-full">
                        <div className="flex items-start gap-3">
                          <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-lg shrink-0">
                            <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin" />
                          </div>
                          <div>
                            <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Aguardando pagamento</h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                              {paymentResult?.payment?.billingType === "PIX" 
                                ? "O pagamento via PIX leva alguns segundos para ser confirmado. Assim que recebermos, você receberá o acesso por e-mail."
                                : "O boleto pode levar até 48 horas úteis para ser compensado. Você receberá o acesso por e-mail após a confirmação bancária."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-left max-w-sm w-full space-y-2">
                        <h4 className="font-bold text-green-800 text-sm">Como acessar a plataforma:</h4>
                        <div className="text-sm text-green-700">
                           <p><strong>E-mail:</strong> o mesmo informado na compra</p>
                           <p><strong>Senha inicial:</strong> seu CPF (apenas os números, sem pontos ou traços)</p>
                        </div>
                    </div>

                    {paymentResult?.payment?.billingType === "PIX" && paymentResult?.payment?.pix && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 border rounded-3xl w-full max-w-sm space-y-6 shadow-sm">
                            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block relative group">
                                 <img src={`data:image/png;base64,${paymentResult.payment.pix.encodedImage}`} alt="QR Code PIX" className="w-56 h-56" />
                            </div>
                            <div className="space-y-3 text-left">
                                <Label className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Código Copia e Cola</Label>
                                <div className="flex gap-2">
                                    <Input value={paymentResult.payment.pix.payload} readOnly className="bg-white dark:bg-slate-900 text-xs h-10 rounded-lg border-slate-200" />
                                    <Button size="sm" className="bg-slate-900 dark:bg-slate-700 font-bold" onClick={() => {
                                        navigator.clipboard.writeText(paymentResult.payment.pix.payload);
                                        toast({ title: "Copiado!", description: "Código PIX copiado com sucesso." });
                                    }}>Copiar</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {paymentResult?.payment?.billingType === "BOLETO" && (
                         <Button asChild className="w-full max-w-sm h-14 text-lg font-black rounded-xl" variant="default">
                             <a href={paymentResult.payment.bankSlipUrl} target="_blank" rel="noopener noreferrer">
                                 <FileText className="mr-2 h-6 w-6" />
                                 Baixar Boleto Bancário
                             </a>
                         </Button>
                    )}

                    {paymentResult?.payment?.billingType === "CREDIT_CARD" && (
                        <Button asChild variant="link" className="text-primary font-black hover:no-underline text-lg mt-6">
                            <Link to={`/aluno/cursos/${courseSlug}`}>
                                Começar a estudar agora
                            </Link>
                        </Button>
                    )}
                  </CardContent>
                </Card>
            </div>
        </InclusiveSiteLayout>
    );
  }

  return (
    <InclusiveSiteLayout>
      <div className="bg-white dark:bg-slate-950 font-sans pb-20">
        {/* Banner de Hero */}
        <section className="relative h-64 md:h-96 w-full overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 z-10" />
            {course?.imagem_url ? (
                <img src={course.imagem_url} alt={course.titulo} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <ShoppingBag className="w-20 h-20 text-slate-300" />
                </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 z-20 bg-gradient-to-t from-black/80 to-transparent">
                <div className="max-w-4xl mx-auto text-white space-y-2">
                    <Badge className="bg-primary hover:bg-primary text-white border-none font-bold uppercase tracking-widest">Inscrições Abertas</Badge>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-lg">{course?.titulo}</h1>
                </div>
            </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 py-12 -mt-8 relative z-30">
          <Card className="border-none shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-none dark:bg-slate-900 rounded-2xl overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
            <CardContent className="p-0">
               {/* Mini Summary / Price Info */}
               <div className="bg-slate-50 dark:bg-slate-800/40 p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b">
                   <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border bg-white flex-shrink-0">
                         {course?.imagem_url ? (
                             <img src={course.imagem_url} alt={course.titulo} className="w-full h-full object-cover" />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-200"><Check /></div>
                         )}
                      </div>
                      <div>
                         <h2 className="font-bold text-slate-900 dark:text-white leading-tight">{course?.titulo}</h2>
                         {course?.parcelas && <p className="text-primary text-sm font-black">{course.parcelas}x de R$ {course.valor_parcela}</p>}
                      </div>
                   </div>
                    <div className="text-right">
                       <p className="text-xs uppercase font-black text-slate-400 tracking-widest">Valor à vista</p>
                       <div className="relative">
                         {couponResult ? (
                           <>
                             <p className="text-sm text-slate-400 line-through transition-all duration-300">R$ {courseValorTotal.toFixed(2)}</p>
                             <div className="flex items-center gap-2 justify-end">
                               <Badge className="bg-green-500 hover:bg-green-600 text-white border-none font-bold text-xs animate-in zoom-in duration-300">
                                 {couponResult.tipo === 'percentual'
                                   ? `-${couponResult.valor_desconto}%`
                                   : `-R$ ${couponResult.desconto_aplicado.toFixed(2)}`}
                               </Badge>
                               <p className="text-3xl font-black text-green-600 dark:text-green-400 tracking-tighter">
                                 R$ {displayPrice.toFixed(2)}
                               </p>
                             </div>
                           </>
                         ) : (
                           <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">R$ {courseValorTotal.toFixed(2)}</p>
                         )}
                       </div>
                       {courseInscricao > 0 && !couponResult && (
                         <p className="text-xs text-slate-400 mt-1">
                           Curso R$ {Number(course?.valor || 0).toFixed(2)} + Taxa R$ {courseInscricao.toFixed(2)}
                         </p>
                       )}
                    </div>
                </div>

               <div className="p-6 md:p-10 space-y-12">
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                    
                    {/* Section 1: Dados Pessoais */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">1</div>
                            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Dados Pessoais</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-black uppercase text-slate-500 tracking-wider">Nome Completo</Label>
                                <Input 
                                    id="name" 
                                    placeholder="Digite seu nome completo" 
                                    {...form.register("name")}
                                    className="h-14 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-900 dark:text-slate-100"
                                />
                                {form.formState.errors.name && <p className="text-xs text-red-500 font-bold mt-1">{form.formState.errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-black uppercase text-slate-500 tracking-wider">Seu melhor E-mail</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="exemplo@email.com" 
                                    {...form.register("email", {
                                        onBlur: (e) => handleCheckUser('email', e.target.value)
                                    })}
                                    className="h-14 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-900 dark:text-slate-100"
                                />
                                {form.formState.errors.email && <p className="text-xs text-red-500 font-bold mt-1">{form.formState.errors.email.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cpfCnpj" className="text-xs font-black uppercase text-slate-500 tracking-wider">CPF / CNPJ</Label>
                                <Input 
                                    id="cpfCnpj" 
                                    placeholder="000.000.000-00" 
                                    {...form.register("cpfCnpj", {
                                        onChange: (e) => {
                                            const val = maskCPF(e.target.value);
                                            form.setValue("cpfCnpj", val);
                                        },
                                        onBlur: (e) => handleCheckUser('cpfCnpj', e.target.value)
                                    })}
                                    className="h-14 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-900 dark:text-slate-100"
                                />
                                {form.formState.errors.cpfCnpj && <p className="text-xs text-red-500 font-bold mt-1">{form.formState.errors.cpfCnpj.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-xs font-black uppercase text-slate-500 tracking-wider">Celular / WhatsApp</Label>
                                <Input 
                                    id="phone" 
                                    placeholder="+55 (00) 00000-0000" 
                                    {...form.register("phone", {
                                        onChange: (e) => {
                                            const val = phoneApplyMask(e.target.value);
                                            form.setValue("phone", val);
                                        }
                                    })}
                                    className="h-14 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-900 dark:text-slate-100"
                                />
                                {form.formState.errors.phone && <p className="text-xs text-red-500 font-bold mt-1">{form.formState.errors.phone.message}</p>}
                            </div>
                        </div>
                    </div>

                    <Separator className="opacity-50" />

                    {/* Section 2: Cupom de Desconto */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">2</div>
                            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Cupom de Desconto</h3>
                        </div>

                        <div className="space-y-3">
                            {couponResult ? (
                                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl animate-in slide-in-from-bottom-2 duration-500">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg animate-in zoom-in duration-500">
                                        <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-green-800 dark:text-green-300">{couponResult.mensagem}</p>
                                        <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1">
                                          <TrendingDown className="w-3 h-3" />
                                          Economia de <strong>R$ {couponResult.desconto_aplicado.toFixed(2)}</strong>
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleRemoveCoupon}
                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Input
                                          ref={couponInputRef}
                                          placeholder="Código do cupom"
                                          value={couponCode}
                                          onChange={(e) => handleCouponChange(e.target.value)}
                                          onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                  e.preventDefault();
                                                  handleApplyCoupon();
                                              }
                                          }}
                                          className={`h-14 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-950 uppercase font-bold tracking-wider pr-10 transition-all text-slate-900 dark:text-slate-100 ${couponError ? 'border-red-500 ring-1 ring-red-200 bg-red-50/50' : ''}`}
                                        />
                                        {couponLoading && (
                                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                          </div>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={handleApplyCoupon}
                                        disabled={couponLoading || !couponCode.trim()}
                                        className="h-14 px-6 rounded-xl font-bold bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white"
                                    >
                                        {couponLoading ? "Verificando..." : "Aplicar"}
                                    </Button>
                                </div>
                            )}
                            {couponError && (
                              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-in slide-in-from-top-1 duration-200">
                                  <X className="w-4 h-4 text-red-500 shrink-0" />
                                  <p className="text-xs font-bold text-red-600 dark:text-red-400">{couponError}</p>
                              </div>
                            )}
                            {!couponResult && !couponError && couponCode.length > 0 && couponCode.length < 3 && (
                              <p className="text-xs text-slate-400">Digite ao menos 3 caracteres</p>
                            )}
                        </div>
                    </div>

                    <Separator className="opacity-50" />

                    {/* Section 3: Forma de Pagamento */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">3</div>
                            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Pagamento</h3>
                        </div>

                        <RadioGroup 
                            defaultValue="credit_card" 
                            className="flex flex-col md:flex-row gap-3"
                            onValueChange={(val) => form.setValue("payment_method", val as any)}
                        >
                            <Label
                              htmlFor="cc"
                              className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-5 cursor-pointer transition-all ${
                                paymentMethod === "credit_card" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-slate-100 dark:border-slate-800 hover:bg-slate-50"
                              }`}
                            >
                                <RadioGroupItem value="credit_card" id="cc" className="sr-only" />
                                <div className={`p-2 rounded-lg ${paymentMethod === "credit_card" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm">Cartão</span>
                            </Label>
                            
                            <Label
                              htmlFor="pix"
                              className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-5 cursor-pointer transition-all ${
                                paymentMethod === "pix" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-slate-100 dark:border-slate-800 hover:bg-slate-50"
                              }`}
                            >
                                <RadioGroupItem value="pix" id="pix" className="sr-only" />
                                <div className={`p-2 rounded-lg ${paymentMethod === "pix" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                                    <QrCode className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm">PIX</span>
                            </Label>
                            
                            <Label
                              htmlFor="boleto"
                              className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-5 cursor-pointer transition-all ${
                                paymentMethod === "boleto" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-slate-100 dark:border-slate-800 hover:bg-slate-50"
                              }`}
                            >
                                <RadioGroupItem value="boleto" id="boleto" className="sr-only" />
                                <div className={`p-2 rounded-lg ${paymentMethod === "boleto" ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-sm">Boleto</span>
                            </Label>
                        </RadioGroup>

                        {/* Payment Details Container */}
                        <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500 ring-1 ring-slate-100 dark:ring-slate-800 min-h-[200px] flex flex-col justify-center">
                             {paymentMethod === "credit_card" && (
                                <div className="space-y-10">
                                    {/* Card Info */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Lock className="w-4 h-4 text-green-500" />
                                            <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Informações Seguras do Cartão</span>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-500">Número do Cartão</Label>
                                            <Input 
                                                placeholder="0000 0000 0000 0000" 
                                                {...form.register("credit_card.number", {
                                                    onChange: (e) => {
                                                        const val = maskCardNumber(e.target.value);
                                                        form.setValue("credit_card.number", val);
                                                    }
                                                })} 
                                                className="h-14 font-medium text-lg rounded-xl" 
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-500">Nome impresso</Label>
                                                <Input placeholder="COMO ESTÁ NO CARTÃO" {...form.register("credit_card.holderName")} className="h-14 font-medium rounded-xl" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-500">Validade</Label>
                                                    <div className="flex gap-2">
                                                        <Input 
                                                            placeholder="MM" 
                                                            maxLength={2} 
                                                            {...form.register("credit_card.expiryMonth", {
                                                                onChange: (e) => form.setValue("credit_card.expiryMonth", maskMonth(e.target.value))
                                                            })} 
                                                            className={`h-14 text-center rounded-xl font-bold ${form.formState.errors.credit_card?.expiryMonth ? 'border-red-500' : ''}`} 
                                                        />
                                                        <Input 
                                                            placeholder="AA" 
                                                            maxLength={2} 
                                                            {...form.register("credit_card.expiryYear", {
                                                                onChange: (e) => form.setValue("credit_card.expiryYear", maskYear(e.target.value))
                                                            })} 
                                                            className={`h-14 text-center rounded-xl font-bold ${form.formState.errors.credit_card?.expiryYear ? 'border-red-500' : ''}`} 
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-500">CVV</Label>
                                                    <Input 
                                                        placeholder="000" 
                                                        maxLength={4} 
                                                        {...form.register("credit_card.ccv", {
                                                            onChange: (e) => form.setValue("credit_card.ccv", e.target.value.replace(/\D/g, ''))
                                                        })} 
                                                        className={`h-14 text-center rounded-xl font-bold ${form.formState.errors.credit_card?.ccv ? 'border-red-500' : ''}`} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-500">Parcelamento</Label>
                                            <Controller
                                                control={form.control}
                                                name="installmentCount"
                                                render={({ field }) => (
                                                    <Select
                                                        value={String(field.value || 1)}
                                                        onValueChange={(val) => field.onChange(Number(val))}
                                                    >
                                                        <SelectTrigger className="h-14 rounded-xl font-bold bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                                                            <SelectValue placeholder="Selecione as parcelas" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            {installmentOptions.map((opt) => (
                                                                <SelectItem key={opt} value={String(opt)} className="font-bold">
                                                                    {getInstallmentLabel(opt)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <Separator className="opacity-30" />

                                    {/* Billing Address Info (Required by Asaas) */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="w-4 h-4 text-primary" />
                                            <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Endereço de Cobrança do Cartão</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-500">CEP</Label>
                                                <Input 
                                                    placeholder="00000-000" 
                                                    {...form.register("credit_card.postalCode", {
                                                        onChange: (e) => {
                                                            const val = maskCEP(e.target.value);
                                                            form.setValue("credit_card.postalCode", val);
                                                        }
                                                    })}
                                                    className="h-14 font-medium rounded-xl" 
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-500">Número</Label>
                                                    <Input placeholder="Ex: 123" {...form.register("credit_card.addressNumber")} className="h-14 font-medium rounded-xl" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-500">Complemento (Opç.)</Label>
                                                    <Input placeholder="Bloco, Apt..." {...form.register("credit_card.addressComplement")} className="h-14 font-medium rounded-xl" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             )}

                             {paymentMethod === "pix" && (
                                <div className="space-y-4 flex flex-col items-center text-center">
                                    <div className="bg-primary/10 p-4 rounded-3xl mb-2">
                                        <QrCode className="w-12 h-12 text-primary" />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 dark:text-white">Pagou, liberou!</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                                        O PIX é processado em tempo real. Assim que o pagamento for confirmado, seu acesso será enviado imediatamente ao seu e-mail.
                                    </p>
                                </div>
                             )}

                             {paymentMethod === "boleto" && (
                                <div className="space-y-4 flex flex-col items-center text-center">
                                    <div className="bg-slate-200 p-4 rounded-3xl mb-2">
                                        <FileText className="w-12 h-12 text-slate-600" />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 dark:text-white">Boleto Bancário</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                                        O boleto tem um prazo de compensação de até 48 horas úteis. O acesso será liberado após a confirmação bancária.
                                    </p>
                                    <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100 text-xs font-bold text-slate-400">
                                        <Info className="w-4 h-4" />
                                        Taxa de processamento: R$ 0,00
                                    </div>
                                </div>
                             )}
                        </div>

                        {/* Order Summary */}
                        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-5 space-y-3 ring-1 ring-slate-100 dark:ring-slate-800">
                          <div className="flex items-center gap-2 mb-1">
                            <ShoppingBag className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Resumo do Pedido</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Curso</span>
                            <span className="font-bold text-slate-900 dark:text-white">R$ {Number(course?.valor || 0).toFixed(2)}</span>
                          </div>
                          {courseInscricao > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600 dark:text-slate-400">Taxa de inscrição</span>
                              <span className="font-bold text-slate-900 dark:text-white">R$ {courseInscricao.toFixed(2)}</span>
                            </div>
                          )}
                          {couponResult && (
                            <div className="flex justify-between text-sm animate-in slide-in-from-top-1 duration-300">
                              <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                                <Tag className="w-3 h-3" /> Desconto ({couponResult.codigo})
                              </span>
                              <span className="font-bold text-green-600 dark:text-green-400">
                                - R$ {couponResult.desconto_aplicado.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <Separator className="opacity-50" />
                          <div className="flex justify-between text-base">
                            <span className="font-black text-slate-900 dark:text-white">Total</span>
                            <span className={`font-black text-xl ${couponResult ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                              R$ {(couponResult ? displayPrice : courseValorTotal).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Section 4: Contrato / Termos de Adesão */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">4</div>
                                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Contrato</h3>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-5 space-y-4 ring-1 ring-slate-100 dark:ring-slate-800">
                                <div className="flex items-start gap-3">
                                    <ScrollText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Termos de Adesão e Prestação de Serviço</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            Ao concluir esta compra, você declara que leu e concorda com os termos de uso da plataforma, 
                                            a política de privacidade e as condições de prestação de serviço educacional. 
                                            O acesso ao conteúdo será liberado conforme a confirmação do pagamento.
                                        </p>
                                    </div>
                                </div>
                                <Separator className="opacity-50" />
                                <div className="flex items-center space-x-3">
                                    <Checkbox 
                                        id="terms" 
                                        checked={termsAccepted}
                                        onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                                        className="h-5 w-5 rounded border-2 border-slate-300 dark:border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    />
                                    <Label htmlFor="terms" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer leading-snug">
                                        Li e aceito os <Link to="/pagina/termos" target="_blank" className="text-primary font-bold underline underline-offset-2 hover:text-primary/80 transition-colors">Termos de Uso</Link> e a <Link to="/pagina/politica-de-privacidade" target="_blank" className="text-primary font-bold underline underline-offset-2 hover:text-primary/80 transition-colors">Política de Privacidade</Link>
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-4">
                              <Button 
                                 type="submit" 
                                 disabled={mutation.isPending || !termsAccepted}
                                 className={`w-full h-16 text-xl font-black rounded-2xl shadow-2xl transition-all active:scale-[0.98] group relative overflow-hidden ${termsAccepted ? 'bg-primary hover:bg-primary/90 shadow-primary/30' : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none'}`}
                              >
                                 {couponResult && (
                                   <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                 )}
                                 <ShoppingBag className="mr-3 h-6 w-6 group-hover:rotate-12 transition-transform" />
                                 {mutation.isPending ? "Processando..." : couponResult ? `Comprar por R$ ${displayPrice.toFixed(2)}` : "Comprar agora"}
                              </Button>
                              {couponResult && (
                                <p className="text-center text-xs text-green-600 dark:text-green-400 font-bold flex items-center justify-center gap-1 animate-in fade-in duration-500">
                                  <Sparkles className="w-3 h-3" />
                                  Você está economizando <strong>R$ {couponResult.desconto_aplicado.toFixed(2)}</strong> neste curso!
                                </p>
                              )}

                             <div className="flex flex-col md:flex-row justify-center items-center gap-6 opacity-60">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-green-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Compra 100% Segura</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Qualidade Aprovada</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-slate-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ambiente Criptografado</span>
                                </div>
                             </div>
                        </div>
                    </div>

                  </form>
               </div>
            </CardContent>
          </Card>
        </div>

        <AlertDialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você já possui um cadastro!</AlertDialogTitle>
              <AlertDialogDescription>
                Identificamos que esse E-mail ou CPF/CNPJ já está registrado em nosso sistema.
                Por favor, faça login para continuar a compra com segurança e ter os cursos na mesma conta.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelPrompt}>Continuar mesmo assim</AlertDialogCancel>
              <AlertDialogAction onClick={() => navigate(`/login?redirect=/checkout/${courseSlug}`)}>
                Fazer Login
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </InclusiveSiteLayout>
  );
};

export default FastCheckout;
