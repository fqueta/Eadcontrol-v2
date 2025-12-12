import { Controller, Control } from "react-hook-form";
import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputMask, format } from "@react-input/mask";

type MaskedInputFieldProps = {
  name: string;
  control: Control<any>; // pode tipar com seu schema
  label: string;
  mask: string;
  placeholder?: string;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
};

export function MaskedInputField({
  name,
  control,
  label,
  mask,
  placeholder,
  onBlur,
  disabled,
}: MaskedInputFieldProps) {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <InputMask
                  mask={mask}
                  replacement={{ d: /\d/ }}
                  value={field.value && mask && typeof field.value === 'string' && field.value.trim() !== '' ? format(field.value, { mask, replacement: { d: /\d/ } }) : ""}
                  onChange={field.onChange}
                  onBlur={onBlur}
                  disabled={disabled}
                  placeholder={placeholder}
                  ref={field.ref}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            )}
            />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}
