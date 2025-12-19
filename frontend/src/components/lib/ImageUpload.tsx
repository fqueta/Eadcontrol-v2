import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Evite dependência de wrappers de formulário para permitir uso standalone fora de FormProvider.
import { Upload, X, User, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

type ImageUploadProps = {
  name: string;
  label?: string;
  value?: string;
  onChange: (value: string | null) => void;
  onUpload?: (file: File) => Promise<string>;
  disabled?: boolean;
  className?: string;
  maxSize?: number; // em MB
  acceptedTypes?: string[];
};

/**
 * Componente de upload de imagem com preview
 * Suporta drag & drop e validação de tipo/tamanho
 * @param props Propriedades do componente
 * @returns Componente de upload de imagem
 */
export function ImageUpload({
  name,
  label = 'Foto',
  value,
  onChange,
  onUpload,
  disabled = false,
  className,
  maxSize = 5, // 5MB por padrão
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Valida o arquivo selecionado
   * @param file Arquivo para validação
   * @returns true se o arquivo é válido
   */
  const validateFile = (file: File): boolean => {
    // Verifica tipo
    if (!acceptedTypes.includes(file.type)) {
      setError(`Tipo de arquivo não suportado. Use: ${acceptedTypes.map(type => type.split('/')[1]).join(', ')}`);
      return false;
    }

    // Verifica tamanho
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`Arquivo muito grande. Tamanho máximo: ${maxSize}MB`);
      return false;
    }

    setError('');
    return true;
  };

  /**
   * Converte arquivo para base64
   * @param file Arquivo para conversão
   * @returns Promise com string base64
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  /**
   * Processa o arquivo selecionado
   * @param file Arquivo selecionado
   */
  const handleFile = async (file: File) => {
    if (!validateFile(file)) return;

    setIsLoading(true);
    try {
      // Se onUpload for fornecido, delega o envio ao backend e usa a URL retornada
      if (onUpload) {
        const url = await onUpload(file);
        onChange(url);
      } else {
        // Fallback: usa base64 para preview/local storage
        const base64 = await fileToBase64(file);
        onChange(base64);
      }
    } catch (error) {
      setError(onUpload ? 'Erro ao enviar imagem' : 'Erro ao processar arquivo');
      console.error('Erro no upload:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Manipula o evento de mudança do input
   * @param event Evento de mudança
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  /**
   * Manipula eventos de drag & drop
   */
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  /**
   * Remove a imagem selecionada
   */
  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Abre o seletor de arquivos
   */
  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
        <div className="space-y-4">
          {/* Preview da imagem */}
          {value && (
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-50">
                <img
                  src={value}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={handleRemove}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          {/* Área de upload */}
          {!value && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isDragging
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-300 hover:border-gray-400",
                disabled && "opacity-50 cursor-not-allowed",
                isLoading && "opacity-50 cursor-wait"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClick}
            >
              <div className="flex flex-col items-center space-y-2">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      {value ? (
                        <Camera className="h-6 w-6 text-gray-600" />
                      ) : (
                        <User className="h-6 w-6 text-gray-600" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-purple-600">Clique para enviar</span>
                      <span> ou arraste uma imagem aqui</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      PNG, JPG, WEBP até {maxSize}MB
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Input oculto */}
          <Input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleInputChange}
            disabled={disabled || isLoading}
            className="hidden"
            value=""
          />
        </div>
      
      {/* Mensagem de erro */}
      {error && (
        <div className="text-sm text-red-600 mt-1">
          {error}
        </div>
      )}
      
    </div>
  );
}