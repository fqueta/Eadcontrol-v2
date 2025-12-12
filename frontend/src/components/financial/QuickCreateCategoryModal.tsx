/**
 * Modal para cadastro rápido de categoria financeira
 * Usado no formulário de contas a receber/pagar
 */

import React, { useState } from 'react';
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
import { Switch } from '../ui/switch';
import { useToast } from '../../hooks/use-toast';
import { Plus } from 'lucide-react';
import {
  FinancialCategory,
  TransactionType,
  CreateFinancialCategoryInput,
  FINANCIAL_CATEGORY_COLORS,
  FINANCIAL_CATEGORY_TYPES
} from '../../types/financial';
import { useCreateFinancialCategory } from '../../hooks/financialCategories';

interface QuickCreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated: (category: FinancialCategory) => void;
  categoryType: TransactionType;
}

interface CategoryFormData {
  name: string;
  description: string;
  type: TransactionType;
  color: string;
  isActive: boolean;
}

/**
 * Componente de modal para cadastro rápido de categoria financeira
 */
export const QuickCreateCategoryModal: React.FC<QuickCreateCategoryModalProps> = ({
  isOpen,
  onClose,
  onCategoryCreated,
  categoryType
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    type: categoryType,
    color: FINANCIAL_CATEGORY_COLORS[0],
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Hook para criação de categoria
  const createMutation = useCreateFinancialCategory();

  /**
   * Reseta o formulário quando o modal abre/fecha
   */
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        type: categoryType,
        color: FINANCIAL_CATEGORY_COLORS[0],
        isActive: true
      });
      setErrors({});
    }
  }, [isOpen, categoryType]);

  /**
   * Valida os dados do formulário
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.type) {
      newErrors.type = 'Tipo é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Manipula mudanças nos campos do formulário
   */
  const handleInputChange = (field: keyof CategoryFormData, value: any) => {
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
    
    try {
      const createData: CreateFinancialCategoryInput = {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        color: formData.color,
        isActive: formData.isActive
      };
      
      const newCategory = await createMutation.mutateAsync(createData);
      onCategoryCreated(newCategory);
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar categoria:', error);
      // Erro já tratado no hook
    }
  };

  /**
   * Retorna o label do tipo de categoria
   */
  const getCategoryTypeLabel = (type: TransactionType): string => {
    return type === TransactionType.INCOME ? 'Receita' : 'Despesa';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Nova Categoria de {getCategoryTypeLabel(categoryType)}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Nome da categoria"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <span className="text-sm text-red-500">{errors.name}</span>
            )}
          </div>

          {/* Tipo */}
          <div>
            <Label htmlFor="type">Tipo *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value as TransactionType)}
            >
              <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_CATEGORY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <span className="text-sm text-red-500">{errors.type}</span>
            )}
          </div>

          {/* Cor */}
          <div>
            <Label htmlFor="color">Cor da Categoria</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {FINANCIAL_CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? "border-gray-900" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleInputChange('color', color)}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-16 h-10 p-1 border rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Status Ativo */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Categoria Ativa</Label>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
            />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descrição da categoria (opcional)"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickCreateCategoryModal;