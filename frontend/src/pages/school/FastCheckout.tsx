import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Check, CreditCard, QrCode, FileText, Lock, ShieldCheck, Star, ShoppingBag, Info, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { checkoutService } from "@/services/checkoutService";
import { useToast } from "@/components/ui/use-toast";
import InclusiveSiteLayout from "@/components/layout/InclusiveSiteLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { phoneApplyMask } from "@/lib/masks/phone-apply-mask";
import { useAuth } from "@/contexts/AuthContext";

// Form Validation Schema
const checkoutSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  cpfCnpj: z.string().min(14, "Documento inválido"), // 000.000.000-00
  phone: z.string().min(10, "Telefone inválido"),
  payment_method: z.enum(["credit_card", "pix", "boleto"]),
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

const FastCheckout = () => {
  const { courseSlug } = useParams<{ courseSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginWithResponse } = useAuth();
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ["checkout", "course", courseSlug],
    queryFn: () => checkoutService.getCourse(courseSlug!),
    enabled: !!courseSlug,
  });

  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      payment_method: "credit_card",
    },
  });

  const paymentMethod = form.watch("payment_method");

  const mutation = useMutation({
    mutationFn: (data: CheckoutValues) => {
        const payload: any = {
            ...data,
            course_id: course?.id,
            cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
            phone: data.phone.replace(/\D/g, ''),
        };

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

      // Se for Cartão e tiver resposta de auth, logar e redirecionar
      if (data.auth_response) {
          await loginWithResponse(data.auth_response);
          if (data.course_slug) {
              navigate(`/aluno/cursos/${data.course_slug}`);
              return;
          }
      }

      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        {paymentResult?.billingType === "PIX" 
                          ? "Escaneie o código PIX abaixo para liberar seu acesso instantaneamente." 
                          : "Seu pedido foi registrado com sucesso. Verifique seu e-mail para os próximos passos."}
                      </p>
                    </div>

                    {paymentResult?.billingType === "PIX" && paymentResult?.pix && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-8 border rounded-3xl w-full max-w-sm space-y-6 shadow-sm">
                            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block relative group">
                                 <img src={`data:image/png;base64,${paymentResult.pix.encodedImage}`} alt="QR Code PIX" className="w-56 h-56" />
                            </div>
                            <div className="space-y-3 text-left">
                                <Label className="text-[10px] uppercase text-slate-400 font-black tracking-widest">Código Copia e Cola</Label>
                                <div className="flex gap-2">
                                    <Input value={paymentResult.pix.payload} readOnly className="bg-white dark:bg-slate-900 text-xs h-10 rounded-lg border-slate-200" />
                                    <Button size="sm" className="bg-slate-900 dark:bg-slate-700 font-bold" onClick={() => {
                                        navigator.clipboard.writeText(paymentResult.pix.payload);
                                        toast({ title: "Copiado!", description: "Código PIX copiado com sucesso." });
                                    }}>Copiar</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {paymentResult?.billingType === "BOLETO" && (
                         <Button asChild className="w-full max-w-sm h-14 text-lg font-black rounded-xl" variant="default">
                             <a href={paymentResult.bankSlipUrl} target="_blank" rel="noopener noreferrer">
                                 <FileText className="mr-2 h-6 w-6" />
                                 Baixar Boleto Bancário
                             </a>
                         </Button>
                    )}

                    <Button variant="link" onClick={() => navigate("/")} className="text-primary font-black hover:no-underline text-lg">
                        Começar a estudar agora
                    </Button>
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
                      <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">R$ {course?.valor}</p>
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
                                    className="h-14 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                />
                                {form.formState.errors.name && <p className="text-xs text-red-500 font-bold mt-1">{form.formState.errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-black uppercase text-slate-500 tracking-wider">Seu melhor E-mail</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="exemplo@email.com" 
                                    {...form.register("email")}
                                    className="h-14 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
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
                                        }
                                    })}
                                    className="h-14 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
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
                                    className="h-14 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                />
                                {form.formState.errors.phone && <p className="text-xs text-red-500 font-bold mt-1">{form.formState.errors.phone.message}</p>}
                            </div>
                        </div>
                    </div>

                    <Separator className="opacity-50" />

                    {/* Section 2: Forma de Pagamento */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">2</div>
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
                                            <Select defaultValue="1">
                                                <SelectTrigger className="h-14 rounded-xl font-bold bg-white">
                                                    <SelectValue placeholder="Selecione as parcelas" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="1" className="font-bold">01x de R$ {course?.valor} (Sem Juros)</SelectItem>
                                                    {course?.parcelas && Number(course.parcelas) > 1 && (
                                                        <SelectItem value={String(course.parcelas)} className="font-bold">
                                                            {course.parcelas}x de R$ {course.valor_parcela} (Sem Juros)
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
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

                        <div className="space-y-6 pt-4">
                             <Button 
                                type="submit" 
                                disabled={mutation.isPending}
                                className="w-full bg-primary hover:bg-primary/90 h-16 text-xl font-black rounded-2xl shadow-2xl shadow-primary/30 transition-all active:scale-[0.98] group"
                             >
                                <ShoppingBag className="mr-3 h-6 w-6 group-hover:rotate-12 transition-transform" />
                                {mutation.isPending ? "Processando..." : "Comprar agora"}
                             </Button>

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
      </div>
    </InclusiveSiteLayout>
  );
};

export default FastCheckout;
