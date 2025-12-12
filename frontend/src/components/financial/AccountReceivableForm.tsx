/**
 * Formulário para criação e edição de contas a receber
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'react-hot-toast';
import { Plus } from 'lucide-react';
import {
  AccountReceivable,
  CreateAccountReceivableDto,
  PaymentMethod,
  RecurrenceType,
  FinancialCategory
} from '../../types/financial';
import { financialService } from '../../services/financialService';
import QuickCreateCategoryModal from './QuickCreateCategoryModal';

interface AccountReceivableFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  account?: AccountReceivable;
  categories: FinancialCategory[];
}

/**
 * Componente de formulário para contas a receber
 */
export const AccountReceivableForm: React.FC<AccountReceivableFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  account,
  categories
}) => {
  const [formData, setFormData] = useState<CreateAccountReceivableDto>({
    description: '',
    amount: 0,
    dueDate: '',
    category: '',
    customerName: '',
    serviceOrderId: '',
    invoiceNumber: '',
    paymentMethod: PaymentMethod.CASH,
    notes: '',
    recurrence: RecurrenceType.NONE,
    installments: 1
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [localCategories, setLocalCategories] = useState<FinancialCategory[]>(categories);

  /**
   * Preenche o formulário quando editando uma conta existente
   */
  useEffect(() => {
    if (account) {
      setFormData({
        description: account.description,
        amount: account.amount,
        dueDate: account.dueDate.split('T')[0], // Formato YYYY-MM-DD
        category: account.category,
        customerName: account.customerName || '',
        serviceOrderId: account.serviceOrderId || '',
        invoiceNumber: account.invoiceNumber || '',
        paymentMethod: account.paymentMethod || PaymentMethod.CASH,
        notes: account.notes || '',
        recurrence: account.recurrence || RecurrenceType.NONE,
        installments: account.installments || 1
      });
    } else {
      // Reset form for new account
      setFormData({
        description: '',
        amount: 0,
        dueDate: '',
        category: '',
        customerName: '',
        serviceOrderId: '',
        invoiceNumber: '',
        paymentMethod: PaymentMethod.CASH,
        notes: '',
        recurrence: RecurrenceType.NONE,
        installments: 1
      });
    }
    setErrors({});
  }, [account, isOpen]);

  /**
   * Atualiza categorias locais quando as props mudam
   */
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  /**
   * Valida os dados do formulário
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Data de vencimento é obrigatória';
    }

    if (!formData.category) {
      newErrors.category = 'Categoria é obrigatória';
    }

    if (formData.installments && formData.installments < 1) {
      newErrors.installments = 'Número de parcelas deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Manipula mudanças nos campos do formulário
   */
  const handleInputChange = (field: keyof CreateAccountReceivableDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Remove error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * Submete o formulário
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      if (account) {
        // Editar conta existente
        await financialService.accountsReceivable.update(account.id, formData);
        toast.success('Conta a receber atualizada com sucesso!');
      } else {
        // Criar nova conta
        await financialService.accountsReceivable.create(formData);
        toast.success('Conta a receber criada com sucesso!');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar conta a receber:', error);
      toast.error(error.response?.data?.message || 'Erro ao salvar conta a receber');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Manipula criação de nova categoria
   */
  const handleCategoryCreated = (newCategory: FinancialCategory) => {
    setLocalCategories(prev => [...prev, newCategory]);
    setFormData(prev => ({ ...prev, category: newCategory.id }));
    setShowCategoryModal(false);
  };

  /**
   * Filtra categorias de receita
   */
  const incomeCategories = localCategories.filter(cat => cat.type === 'income' && cat.isActive);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Descrição */}
            <div className="md:col-span-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descrição da conta a receber"
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <span className="text-sm text-red-500">{errors.description}</span>
              )}
            </div>

            {/* Valor */}
            <div>
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && (
                <span className="text-sm text-red-500">{errors.amount}</span>
              )}
            </div>

            {/* Data de Vencimento */}
            <div>
              <Label htmlFor="dueDate">Data de Vencimento *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className={errors.dueDate ? 'border-red-500' : ''}
              />
              {errors.dueDate && (
                <span className="text-sm text-red-500">{errors.dueDate}</span>
              )}
            </div>

            {/* Categoria */}
            <div>
              <Label htmlFor="category">Categoria *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowCategoryModal(true)}
                  title="Criar nova categoria"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.category && (
                <span className="text-sm text-red-500">{errors.category}</span>
              )}
            </div>

            {/* Cliente */}
            <div>
              <Label htmlFor="customerName">Cliente</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            {/* Ordem de Serviço */}
            <div>
              <Label htmlFor="serviceOrderId">Ordem de Serviço</Label>
              <Input
                id="serviceOrderId"
                value={formData.serviceOrderId}
                onChange={(e) => handleInputChange('serviceOrderId', e.target.value)}
                placeholder="Número da OS"
              />
            </div>

            {/* Número da Nota Fiscal */}
            <div>
              <Label htmlFor="invoiceNumber">Número da NF</Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                placeholder="Número da nota fiscal"
              />
            </div>

            {/* Forma de Pagamento */}
            <div>
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => handleInputChange('paymentMethod', value as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.CASH}>Dinheiro</SelectItem>
                  <SelectItem value={PaymentMethod.CREDIT_CARD}>Cartão de Crédito</SelectItem>
                  <SelectItem value={PaymentMethod.DEBIT_CARD}>Cartão de Débito</SelectItem>
                  <SelectItem value={PaymentMethod.BANK_TRANSFER}>Transferência Bancária</SelectItem>
                  <SelectItem value={PaymentMethod.PIX}>PIX</SelectItem>
                  <SelectItem value={PaymentMethod.CHECK}>Cheque</SelectItem>
                  <SelectItem value={PaymentMethod.BOLETO}>Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recorrência */}
            <div>
              <Label htmlFor="recurrence">Recorrência</Label>
              <Select
                value={formData.recurrence}
                onValueChange={(value) => handleInputChange('recurrence', value as RecurrenceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RecurrenceType.NONE}>Nenhuma</SelectItem>
                  <SelectItem value={RecurrenceType.DAILY}>Diária</SelectItem>
                  <SelectItem value={RecurrenceType.WEEKLY}>Semanal</SelectItem>
                  <SelectItem value={RecurrenceType.MONTHLY}>Mensal</SelectItem>
                  <SelectItem value={RecurrenceType.QUARTERLY}>Trimestral</SelectItem>
                  <SelectItem value={RecurrenceType.YEARLY}>Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Número de Parcelas */}
            {formData.recurrence !== RecurrenceType.NONE && (
              <div>
                <Label htmlFor="installments">Número de Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  value={formData.installments}
                  onChange={(e) => handleInputChange('installments', parseInt(e.target.value) || 1)}
                  className={errors.installments ? 'border-red-500' : ''}
                />
                {errors.installments && (
                  <span className="text-sm text-red-500">{errors.installments}</span>
                )}
              </div>
            )}

            {/* Observações */}
            <div className="md:col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Observações adicionais"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : account ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Modal de Cadastro Rápido de Categoria */}
      <QuickCreateCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoryCreated={handleCategoryCreated}
        categoryType="income"
      />
    </Dialog>
  );
};

export default AccountReceivableForm;