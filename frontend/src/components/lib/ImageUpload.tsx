import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Evite dependência de wrappers de formulário para permitir uso standalone fora de FormProvider.
import { Upload, X, User, Camera, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImageFile, formatFileSize } from '@/lib/imageCompression';

type ImageUploadProps = {
  name: string;
  label?: string;
  value?: string;
  onChange: (value: string | null) => void;
  onUpload?: (file: File) => Promise<string>;
  disabled?: boolean;
  className?: string;
  maxSize?: number; // em MB para o arquivo pós-compressão (padrão 5MB)
  maxRawSize?: number; // em MB para seleção inicial de fotos pesadas de câmera (padrão 35MB)
  acceptedTypes?: string[];
  autoCompress?: boolean; // padrão true
  maxWidth?: number; // padrão 1920
  maxHeight?: number; // padrão 1920
  quality?: number; // padrão 0.85
};

/**
 * Componente de upload de imagem com preview e compressão inteligente automática.
 * Suporta drag & drop, redimensionamento automático de fotos pesadas de smartphone
 * e feedback visual de economia de peso.
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
  maxSize = 5, // 5MB após compressão
  maxRawSize = 35, // permite até 35MB de foto bruta da câmera
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  autoCompress = true,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState<string>('');
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    savingsPercent: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
   * Processa o arquivo selecionado com compressão automática opcional
   * @param rawFile Arquivo selecionado pelo usuário
   */
  const handleFile = async (rawFile: File) => {
    setError('');
    setCompressionInfo(null);

    // Valida tipo aceito
    if (!acceptedTypes.includes(rawFile.type)) {
      setError(`Tipo de arquivo não suportado. Use: ${acceptedTypes.map(t => t.split('/')[1] || t).join(', ')}`);
      return;
    }

    // Valida tamanho inicial bruto
    const maxRawSizeBytes = maxRawSize * 1024 * 1024;
    if (rawFile.size > maxRawSizeBytes) {
      setError(`Arquivo original muito grande. Máximo permitido: ${maxRawSize}MB`);
      return;
    }

    let finalFile = rawFile;

    // Compressão inteligente automática no navegador
    if (autoCompress && rawFile.type.startsWith('image/')) {
      try {
        setIsLoading(true);
        setCompressionStatus('Otimizando imagem...');
        const compResult = await compressImageFile(rawFile, {
          maxWidth,
          maxHeight,
          quality,
        });

        if (compResult.wasCompressed) {
          finalFile = compResult.file;
          setCompressionInfo({
            originalSize: compResult.originalSize,
            compressedSize: compResult.compressedSize,
            savingsPercent: compResult.savingsPercent,
          });
        }
      } catch (compressErr) {
        console.warn('[ImageUpload] Falha na compressão client-side, mantendo original:', compressErr);
      }
    }

    // Valida tamanho final após compressão
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (finalFile.size > maxSizeBytes) {
      setError(`O arquivo excede o limite máximo permitido (${formatFileSize(finalFile.size)} > ${maxSize}MB).`);
      setIsLoading(false);
      setCompressionStatus('');
      return;
    }

    try {
      setIsLoading(true);
      setCompressionStatus('Enviando...');
      // Se onUpload for fornecido, delega o envio ao backend e usa a URL retornada
      if (onUpload) {
        const url = await onUpload(finalFile);
        onChange(url);
      } else {
        // Fallback: usa base64 para preview/local storage
        const base64 = await fileToBase64(finalFile);
        onChange(base64);
      }
    } catch (err) {
      setError(onUpload ? 'Erro ao enviar imagem' : 'Erro ao processar arquivo');
      console.error('Erro no upload:', err);
    } finally {
      setIsLoading(false);
      setCompressionStatus('');
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
    setCompressionInfo(null);
    setError('');
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
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="space-y-4">
        {/* Preview da imagem */}
        {value && (
          <div className="space-y-2">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-sm">
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
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 shadow-md"
                  onClick={handleRemove}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Badge de economia quando otimizado */}
            {compressionInfo && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-md px-2.5 py-1 w-fit">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  Otimizado: {formatFileSize(compressionInfo.originalSize)} ➔ {formatFileSize(compressionInfo.compressedSize)} (-{compressionInfo.savingsPercent}%)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Área de upload */}
        {!value && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600",
              disabled && "opacity-50 cursor-not-allowed",
              isLoading && "opacity-60 cursor-wait"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <div className="flex flex-col items-center space-y-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center space-y-2 py-1">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 animate-pulse">
                    {compressionStatus || 'Processando...'}
                  </span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">Clique para enviar</span>
                    <span> ou arraste uma imagem aqui</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, WEBP • Otimização e compressão automática
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
        <div className="text-sm text-red-600 dark:text-red-400 mt-1">
          {error}
        </div>
      )}
    </div>
  );
}