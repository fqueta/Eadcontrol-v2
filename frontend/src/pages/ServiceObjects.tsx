import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useServiceObjectsList, useCreateServiceObject, useUpdateServiceObject, useDeleteServiceObject } from "@/hooks/serviceObjects";
import { useClientsList } from "@/hooks/clients";
import { ServiceObjectForm } from "@/components/serviceObjects/ServiceObjectForm";
import { ServiceObjectsTable } from "@/components/serviceObjects/ServiceObjectsTable";
import type { CreateServiceObjectInput, UpdateServiceObjectInput, ServiceObjectRecord } from "@/types/serviceObjects";

const schema = z.object({
  client_id: z.string().min(1, "Cliente é obrigatório"),
  type: z.enum(["automovel", "aeronave"], { required_error: "Tipo é obrigatório" }),
  identifier_primary: z.string().min(1, "Identificador principal é obrigatório"),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  year: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  color: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const ServiceObjects = () => {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Hooks para API
  const { data: serviceObjectsData, isLoading: isLoadingServiceObjects, refetch } = useServiceObjectsList();
  const { data: clientsData, isLoading: isLoadingClients } = useClientsList();
  const createMutation = useCreateServiceObject();
  const updateMutation = useUpdateServiceObject();
  const deleteMutation = useDeleteServiceObject();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "automovel" },
  });

  const serviceObjects = serviceObjectsData?.data || [];
  const clients = clientsData?.data || [];

  useEffect(() => {
    document.title = "Objetos do Serviço | Sistema OS";
  }, []);

  /**
   * Função para submeter o formulário (criar ou editar)
   */
  const onSubmit = async (data: FormValues) => {
    try {
      if (editingId) {
        // Editar objeto existente
        await updateMutation.mutateAsync({ id: editingId, data });
        setEditingId(null);
      } else {
        // Criar novo objeto
        await createMutation.mutateAsync(data as CreateServiceObjectInput);
      }
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Erro ao salvar objeto de serviço:', error);
    }
  };

  /**
   * Função para iniciar a edição de um objeto
   */
  const handleEdit = (serviceObject: ServiceObjectRecord) => {
    const anyServiceObject = serviceObject as any;
    setEditingId(serviceObject.id);
    form.setValue('client_id', serviceObject.client_id);
    form.setValue('type', serviceObject.type);
    // Usar o identificador apropriado baseado no tipo
    const primaryIdentifier = serviceObject.type === 'automovel' 
      ? (serviceObject.placa || serviceObject.chassi || serviceObject.renavam || '')
      : (serviceObject.matricula || serviceObject.numero_serie || '');
    form.setValue('identifier_primary', primaryIdentifier);
    form.setValue('manufacturer', serviceObject.manufacturer || '');
    form.setValue('model', serviceObject.model || '');
    form.setValue('year', anyServiceObject.year ? anyServiceObject.year.toString() : '');
    form.setValue('color', serviceObject.color || '');
    form.setValue('notes', serviceObject.notes || '');
    setOpen(true);
  };

  /**
   * Função para confirmar a exclusão de um objeto
   */
  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deleteMutation.mutateAsync(deleteId);
        setDeleteId(null);
      } catch (error) {
        console.error('Erro ao deletar objeto de serviço:', error);
      }
    }
  };

  /**
   * Função para cancelar a edição
   */
  const handleCancelEdit = () => {
    setEditingId(null);
    form.reset();
    setOpen(false);
  };

  const editingServiceObject = editingId ? serviceObjects.find(obj => obj.id === editingId) || null : null;

  return (
    <main className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Objetos do Serviço</h1>
        <p className="text-sm text-muted-foreground">Cadastre e gerencie veículos e aeronaves vinculados aos clientes.</p>
      </header>

      <section aria-label="Lista de objetos do serviço">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Objetos</CardTitle>
            <Dialog open={open} onOpenChange={(isOpen) => {
              if (!isOpen) {
                handleCancelEdit();
              } else {
                setOpen(isOpen);
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={isLoadingClients}>
                  {isLoadingClients ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</>
                  ) : (
                    editingId ? 'Editar Objeto' : 'Novo Objeto'
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Editar Objeto do Serviço' : 'Novo Objeto do Serviço'}
                  </DialogTitle>
                </DialogHeader>
                <ServiceObjectForm
                  form={form}
                  onSubmit={onSubmit}
                  onCancel={handleCancelEdit}
                  editingServiceObject={editingServiceObject}
                  clients={clients}
                  isLoadingClients={isLoadingClients}
                  isSubmitting={createMutation.isPending || updateMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <ServiceObjectsTable
                serviceObjects={serviceObjects}
                onEdit={handleEdit}
                onDelete={(serviceObject) => setDeleteId(serviceObject.id)}
                isLoading={isLoadingServiceObjects}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default ServiceObjects;
