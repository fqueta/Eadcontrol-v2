import { useEffect, useState, useRef } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MaskedInputField } from '@/components/lib/MaskedInputField';
import { cepApplyMask, cepRemoveMask } from '@/lib/masks/cep-apply-mask';
import { Controller } from 'react-hook-form';
import { InputMask, format } from "@react-input/mask";
import { useCep } from '@/hooks/useCep';

interface AddressInputsProps {
  form: any;
}

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

/**
 * AddressInputs
 * pt-BR: Renderiza campos de endereço com máscara de CEP e auto-preenchimento via useCep.
 * en-US: Renders address fields with CEP mask and auto-fill using useCep.
 */
export function AddressInputs({form}: AddressInputsProps){
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const numeroInputRef = useRef<HTMLInputElement>(null);
  const { fetchCep, isValidCep, clearAddressData } = useCep();

  /**
   * Manipula a mudança do CEP
   * @param value - Valor do CEP com máscara
   */
  const handleCepChange = async (value: string) => {
    const cleanCep = cepRemoveMask(value);
    // Armazena o CEP em config.cep para alinhar com schema
    form.setValue("config.cep", value);
    
    if (cleanCep.length === 8 && isValidCep(cleanCep)) {
      try {
        setIsLoadingCep(true);
        const addr = await fetchCep(cleanCep);
        if (addr) {
          form.setValue("config.endereco", addr.endereco || "");
          form.setValue("config.bairro", addr.bairro || "");
          form.setValue("config.cidade", addr.cidade || "");
          form.setValue("config.uf", addr.uf || "");
          setTimeout(() => {
            numeroInputRef.current?.focus();
          }, 100);
        }
      } catch (error) {
        console.error('Erro ao buscar CEP via useCep:', error);
      } finally {
        setIsLoadingCep(false);
      }
    } else {
      clearAddressData?.();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {/* Campo CEP com máscara e busca automática (config.cep) */}
      <FormField
        control={form.control}
        name="config.cep"
        render={({ field }) => (
          <FormItem>
            <FormLabel>CEP {isLoadingCep && "(Buscando...)"}</FormLabel>
            <FormControl>
              <Controller
                name="config.cep"
                control={form.control}
                render={({ field }) => (
                  <InputMask
                    mask="ddddd-ddd"
                    replacement={{ d: /\d/ }}
                    value={field.value && typeof field.value === 'string' && field.value.trim() !== '' ? format(field.value, { mask: "ddddd-ddd", replacement: { d: /\d/ } }) : ""}
                    onChange={(e) => {
                        field.onChange(e.target.value);
                        handleCepChange(e.target.value);
                    }}
                    disabled={isLoadingCep}
                    placeholder="00000-000"
                    ref={field.ref}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                )}
              />
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
              <Input placeholder="Endereço" {...field} value={field.value || ''} />
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
              <Input 
                placeholder="Número" 
                {...field} 
                value={field.value || ''}
                ref={numeroInputRef}
              />
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
              <Input placeholder="Complemento" {...field} value={field.value || ''} />
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
              <Input placeholder="Bairro" {...field} value={field.value || ''} />
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
              <Input placeholder="Cidade" {...field} value={field.value || ''} />
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
            <Select
              onValueChange={field.onChange}
              value={field.value || ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="AC">AC</SelectItem>
                <SelectItem value="AL">AL</SelectItem>
                <SelectItem value="AP">AP</SelectItem>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="BA">BA</SelectItem>
                <SelectItem value="CE">CE</SelectItem>
                <SelectItem value="DF">DF</SelectItem>
                <SelectItem value="ES">ES</SelectItem>
                <SelectItem value="GO">GO</SelectItem>
                <SelectItem value="MA">MA</SelectItem>
                <SelectItem value="MT">MT</SelectItem>
                <SelectItem value="MS">MS</SelectItem>
                <SelectItem value="MG">MG</SelectItem>
                <SelectItem value="PA">PA</SelectItem>
                <SelectItem value="PB">PB</SelectItem>
                <SelectItem value="PR">PR</SelectItem>
                <SelectItem value="PE">PE</SelectItem>
                <SelectItem value="PI">PI</SelectItem>
                <SelectItem value="RJ">RJ</SelectItem>
                <SelectItem value="RN">RN</SelectItem>
                <SelectItem value="RS">RS</SelectItem>
                <SelectItem value="RO">RO</SelectItem>
                <SelectItem value="RR">RR</SelectItem>
                <SelectItem value="SC">SC</SelectItem>
                <SelectItem value="SP">SP</SelectItem>
                <SelectItem value="SE">SE</SelectItem>
                <SelectItem value="TO">TO</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}