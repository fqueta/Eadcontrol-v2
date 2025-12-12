import { Controller, Control } from "react-hook-form";
import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputMask, format } from "@react-input/mask";
import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle } from 'lucide-react';

type SmartDocumentInputProps = {
  name: string;
  control: Control<any>;
  label: string;
  tipoPessoa: 'pf' | 'pj' | string;
  placeholder?: string;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
};

/**
 * Componente inteligente para entrada de CPF/CNPJ
 * Aplica automaticamente a máscara correta baseada no tipo de pessoa
 * @param props Propriedades do componente
 * @returns Componente de input com máscara inteligente
 */
export function SmartDocumentInput({
  name,
  control,
  label,
  tipoPessoa,
  placeholder,
  onBlur,
  disabled,
}: SmartDocumentInputProps) {
  const [mask, setMask] = useState("");
  const [inputPlaceholder, setInputPlaceholder] = useState("");
  const [inputLabel, setInputLabel] = useState("");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [currentValue, setCurrentValue] = useState("");

  /**
   * Atualiza a máscara e placeholder baseado no tipo de pessoa
   */
  useEffect(() => {
    if (tipoPessoa === 'pf') {
      setMask("ddd.ddd.ddd-dd");
      setInputPlaceholder(placeholder || "000.000.000-00");
      setInputLabel(label || "CPF");
    } else if (tipoPessoa === 'pj') {
      setMask("dd.ddd.ddd/dddd-dd");
      setInputPlaceholder(placeholder || "00.000.000/0000-00");
      setInputLabel(label || "CNPJ");
    } else {
      setMask("");
      setInputPlaceholder(placeholder || "Documento");
      setInputLabel(label || "Documento");
    }
  }, [tipoPessoa, placeholder, label]);

  /**
   * Função para validar CPF
   * @param cpf CPF para validação
   * @returns true se o CPF é válido
   */
  const isValidCPF = (cpf: string): boolean => {
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
    
    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.charAt(9))) return false;
    
    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCpf.charAt(10))) return false;
    
    return true;
  };

  /**
   * Função para validar CNPJ
   * @param cnpj CNPJ para validação
   * @returns true se o CNPJ é válido
   */
  const isValidCNPJ = (cnpj: string): boolean => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cleanCnpj)) return false;
    
    // Validação do primeiro dígito verificador
    let sum = 0;
    let weight = 2;
    for (let i = 11; i >= 0; i--) {
      sum += parseInt(cleanCnpj.charAt(i)) * weight;
      weight++;
      if (weight === 10) weight = 2;
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    if (digit1 !== parseInt(cleanCnpj.charAt(12))) return false;
    
    // Validação do segundo dígito verificador
    sum = 0;
    weight = 2;
    for (let i = 12; i >= 0; i--) {
      sum += parseInt(cleanCnpj.charAt(i)) * weight;
      weight++;
      if (weight === 10) weight = 2;
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    if (digit2 !== parseInt(cleanCnpj.charAt(13))) return false;
    
    return true;
  };

  /**
   * Função para validar o documento baseado no tipo
   * @param value Valor do documento
   * @returns true se o documento é válido
   */
  const validateDocument = (value: string): boolean => {
    if (!value) return true; // Campo opcional
    
    if (tipoPessoa === 'pf') {
      return isValidCPF(value);
    } else if (tipoPessoa === 'pj') {
      return isValidCNPJ(value);
    }
    
    return true;
  };

  /**
   * Função para lidar com mudanças no valor e validação em tempo real
   * @param value Novo valor do campo
   */
  const handleValueChange = (value: string) => {
    setCurrentValue(value);
    
    if (value && value.length > 0) {
      const cleanValue = value.replace(/\D/g, '');
      const expectedLength = tipoPessoa === 'pf' ? 11 : 14;
      
      if (cleanValue.length === expectedLength) {
        setIsValid(validateDocument(value));
      } else {
        setIsValid(null); // Ainda digitando
      }
    } else {
      setIsValid(null);
    }
  };

  /**
   * Função para lidar com o evento onBlur e validação
   * @param event Evento de blur
   * @param fieldOnBlur Função onBlur do field
   */
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>, fieldOnBlur?: () => void) => {
    const value = event.target.value;
    
    // Validação final no blur
    if (value && value.length > 0) {
      setIsValid(validateDocument(value));
    }
    
    // Chama o onBlur personalizado se fornecido
    if (onBlur) {
      onBlur(event);
    }
    
    // Chama o onBlur do field
    if (fieldOnBlur) {
      fieldOnBlur();
    }
  };

  // Se não há tipo de pessoa definido, não renderiza o campo
  if (!tipoPessoa || (tipoPessoa !== 'pf' && tipoPessoa !== 'pj')) {
    return null;
  }

  return (
    <FormItem>
      <FormLabel className="text-sm font-medium text-gray-700">
        {inputLabel} {tipoPessoa === 'pf' || tipoPessoa === 'pj' ? '*' : ''}
      </FormLabel>
      <FormControl>
        <div className="relative">
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <InputMask
                mask={mask}
                replacement={{ d: /\d/ }}
                value={field.value && mask && typeof field.value === 'string' && field.value.trim() !== '' ? format(field.value, { mask, replacement: { d: /\d/ } }) : ""}
                onChange={(e) => {
                  field.onChange(e);
                  handleValueChange(e.target.value);
                }}
                onBlur={(e) => handleBlur(e, field.onBlur)}
                disabled={disabled}
                placeholder={inputPlaceholder}
                ref={field.ref}
                className="h-11 pr-10 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            )}
          />
          {isValid === true && (
            <div className="absolute right-3 top-3 flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          )}
          {isValid === false && (
            <div className="absolute right-3 top-3 flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          )}
        </div>
      </FormControl>
      {isValid === false && (
        <div className="mt-1 flex items-center text-sm text-red-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          <span>{tipoPessoa === 'pf' ? 'CPF inválido' : 'CNPJ inválido'}</span>
        </div>
      )}
      <FormMessage />
    </FormItem>
  );
}