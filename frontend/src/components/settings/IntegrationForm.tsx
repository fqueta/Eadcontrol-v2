import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useCreateApiCredential, useUpdateApiCredential } from '@/hooks/apiCredentials';
import { ApiCredential } from '@/types';
import { useState } from 'react';

const integrationSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  active: z.boolean().default(true),
  config: z.array(z.object({
    key: z.string().min(1, 'Chave é obrigatória'),
    value: z.string().optional(),
    isSecret: z.boolean().default(false),
  })).optional(),
  meta: z.array(z.object({
    key: z.string().min(1, 'Chave é obrigatória'),
    value: z.string().optional(),
  })).optional(),
});

type IntegrationFormData = z.infer<typeof integrationSchema>;

interface IntegrationFormProps {
  initialData?: ApiCredential | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function IntegrationForm({ initialData, onSuccess, onCancel }: IntegrationFormProps) {
  const createMutation = useCreateApiCredential();
  const updateMutation = useUpdateApiCredential();
  
  const form = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      name: '',
      active: true,
      config: [{ key: 'url', value: '', isSecret: false }, { key: 'user', value: '', isSecret: false }, { key: 'pass', value: '', isSecret: true }],
      meta: [],
    },
  });

  const { fields: configFields, append: appendConfig, remove: removeConfig } = useFieldArray({
    control: form.control,
    name: "config",
  });

  const { fields: metaFields, append: appendMeta, remove: removeMeta } = useFieldArray({
    control: form.control,
    name: "meta",
  });

  useEffect(() => {
    if (initialData) {
      const configArray = initialData.config 
        ? Object.entries(initialData.config).map(([key, value]) => ({
            key,
            value: String(value), // Ensure string for input
            isSecret: key.toLowerCase().includes('pass') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('token') || key.toLowerCase().includes('key'),
          }))
        : [];
      
      // If config is empty/null, provide defaults
      if (configArray.length === 0) {
          configArray.push({ key: 'url', value: '', isSecret: false });
          configArray.push({ key: 'user', value: '', isSecret: false });
          configArray.push({ key: 'pass', value: '', isSecret: true });
      }

      const metaArray = initialData.metas
        ? initialData.metas.map(m => ({ key: m.key, value: m.value }))
        : [];

      form.reset({
        name: initialData.name,
        active: initialData.active,
        config: configArray,
        meta: metaArray,
      });
    } else {
        form.reset({
            name: '',
            active: true,
            config: [{ key: 'url', value: '', isSecret: false }, { key: 'user', value: '', isSecret: false }, { key: 'pass', value: '', isSecret: true }],
            meta: [],
        });
    }
  }, [initialData, form]);

  const onSubmit = async (data: IntegrationFormData) => {
    // Convert config array back to object
    const configObject = data.config?.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, any>);

    const payload = {
      name: data.name,
      active: data.active,
      config: configObject,
      meta: data.meta,
    };

    try {
      if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess?.();
    } catch (e) {
      console.error(e);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nome da Integração</FormLabel>
                <FormControl>
                    <Input placeholder="Ex: Gateway de Pagamento" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

            <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                <div className="space-y-0.5">
                    <FormLabel className="text-base">Ativo</FormLabel>
                    <FormDescription>
                    Habilitar ou desabilitar esta integração.
                    </FormDescription>
                </div>
                <FormControl>
                    <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    />
                </FormControl>
                </FormItem>
            )}
            />
        </div>

        <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Configurações (JSON)</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => appendConfig({ key: '', value: '', isSecret: false })}>
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Campo
                </Button>
            </div>
            {configFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start mb-2">
                    <FormField
                        control={form.control}
                        name={`config.${index}.key`}
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormControl>
                                    <Input placeholder="Chave (ex: url)" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`config.${index}.value`}
                        render={({ field }) => (
                            <ConfigValueInput field={field} control={form.control} index={index} />
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeConfig(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ))}
             <FormDescription className="mt-2">
                Defina as chaves e valores para a configuração JSON. Senhas serão criptografadas pelo backend.
            </FormDescription>
        </div>

        <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Metadados Extras</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => appendMeta({ key: '', value: '' })}>
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Meta
                </Button>
            </div>
            {metaFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start mb-2">
                    <FormField
                        control={form.control}
                        name={`meta.${index}.key`}
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormControl>
                                    <Input placeholder="Chave (ex: token_expiration)" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`meta.${index}.value`}
                        render={({ field }) => (
                            <FormItem className="flex-[2]">
                                <FormControl>
                                    <Input placeholder="Valor" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMeta(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Helper component for Config Value with visibility toggle
function ConfigValueInput({ field, control, index }: { field: any, control: any, index: number }) {
    const [showPassword, setShowPassword] = useState(false);
    // Watch isSecret to default to password type if needed
    // But local state is easier for toggle.
    // However, if we want "smart" detection (key contains 'pass'), we did that in initialData load.
    // The user can toggle manually.
    
    // We can also have a checkbox for 'isSecret' in the form to persist the preference visually, 
    // but typically just toggling visibility is enough for UX.
    // THE 'isSecret' in schema is purely for UI state in this implementation, 
    // it's not sent to backend unless we want to hint backend. 
    // But backend encrypts based on logic or we just encrypt everything? 
    // Backend encrypts 'pass' field.
    
    // Let's use the schema's isSecret to determine initial input type.
    const isSecret = control._formValues.config[index]?.isSecret;
    const type = isSecret && !showPassword ? 'password' : 'text';

    return (
        <FormItem className="flex-[2] relative">
            <FormControl>
                <div className="relative">
                    <Input type={type} placeholder="Valor" {...field} className="pr-10" />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                    </Button>
                </div>
            </FormControl>
            <FormMessage />
        </FormItem>
    );
}
