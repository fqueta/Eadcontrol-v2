import { useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AddressInputs } from "@/components/lib/AddressInputs";
import { cepApplyMask, cepRemoveMask } from "@/lib/masks/cep-apply-mask";

interface AddressAccordionProps {
  form: any;
}

export function AddressAccordion({ form }: AddressAccordionProps) {
  // Observa mudanças no campo CEP
  useEffect(() => {
    const cep = form.watch("config.cep");
    // Remove caracteres não numéricos
    const cleanCep = cep?.replace(/\D/g, "");
    if (cleanCep && cleanCep.length === 8) {
      fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        .then(res => res.json())
        .then(data => {
          if (!data.erro) {
            form.setValue("config.endereco", data.logradouro || "");
            form.setValue("config.bairro", data.bairro || "");
            form.setValue("config.cidade", data.localidade || "");
            form.setValue("config.uf", data.uf || "");
          }
        });
    }
  }, [form.watch("config.cep")]); // Executa sempre que o CEP mudar

  return (
    <div className="col-span-1 md:col-span-2">
      <Accordion type="single" collapsible>
        <AccordionItem value="endereco">
          <AccordionTrigger>Endereço</AccordionTrigger>
          <AccordionContent>
            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="config.cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input type="text" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config.endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input type="text" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config.numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input type="text" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config.complemento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input type="text" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config.bairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input type="text" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config.cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input type="text" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="config.uf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <FormControl>
                      <Input type="text" maxLength={2} {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div> */}
            <AddressInputs form={form} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}