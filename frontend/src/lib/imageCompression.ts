/**
 * Utilitário para compressão e redimensionamento de imagens no navegador.
 * Reduz arquivos pesados (ex: 5MB - 20MB de smartphones/câmeras) para ~150KB - 300KB
 * preservando alta nitidez e resolução para internet.
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 a 1.0 (padrão 0.85)
  format?: 'image/webp' | 'image/jpeg' | 'auto';
  minSizeToCompressBytes?: number; // Só comprime se passar deste tamanho (padrão 250KB)
}

export interface CompressedImageResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  width: number;
  height: number;
  wasCompressed: boolean;
}

/**
 * Formata bytes em formato legível (KB, MB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Comprime e redimensiona um arquivo de imagem no cliente (navegador).
 */
export async function compressImageFile(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    format = 'auto',
    minSizeToCompressBytes = 250 * 1024, // 250KB
  } = options;

  const originalSize = file.size;

  // Não processa se não for imagem
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savingsPercent: 0,
      width: 0,
      height: 0,
      wasCompressed: false,
    };
  }

  // Pula SVGs e GIFs animados para não quebrar vetores ou animações
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      savingsPercent: 0,
      width: 0,
      height: 0,
      wasCompressed: false,
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const origWidth = img.naturalWidth || img.width;
      const origHeight = img.naturalHeight || img.height;

      // Se a imagem já é menor que o threshold e não ultrapassa dimensões máximas, mantém original
      if (originalSize <= minSizeToCompressBytes && origWidth <= maxWidth && origHeight <= maxHeight) {
        resolve({
          file,
          originalSize,
          compressedSize: originalSize,
          savingsPercent: 0,
          width: origWidth,
          height: origHeight,
          wasCompressed: false,
        });
        return;
      }

      // Calcula novas dimensões mantendo proporção
      let targetWidth = origWidth;
      let targetHeight = origHeight;

      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
        targetWidth = Math.round(targetWidth * ratio);
        targetHeight = Math.round(targetHeight * ratio);
      }

      // Cria canvas offscreen para renderização
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { alpha: true });

      if (!ctx) {
        resolve({
          file,
          originalSize,
          compressedSize: originalSize,
          savingsPercent: 0,
          width: origWidth,
          height: origHeight,
          wasCompressed: false,
        });
        return;
      }

      // Suavização de alta qualidade
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Determina formato de saída
      let targetMimeType = 'image/webp';
      if (format === 'image/jpeg') {
        targetMimeType = 'image/jpeg';
      } else if (format === 'image/webp') {
        targetMimeType = 'image/webp';
      } else {
        // Auto: WebP por padrão (suporta transparência e é 30-50% mais leve que JPEG)
        targetMimeType = 'image/webp';
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              file,
              originalSize,
              compressedSize: originalSize,
              savingsPercent: 0,
              width: origWidth,
              height: origHeight,
              wasCompressed: false,
            });
            return;
          }

          // Se a compressão ficou maior que o original (ex: arquivos já hiper-otimizados), usa o original
          if (blob.size >= originalSize && origWidth <= maxWidth && origHeight <= maxHeight) {
            resolve({
              file,
              originalSize,
              compressedSize: originalSize,
              savingsPercent: 0,
              width: origWidth,
              height: origHeight,
              wasCompressed: false,
            });
            return;
          }

          // Define extensão do arquivo gerado
          let newExtension = 'webp';
          if (targetMimeType === 'image/jpeg') newExtension = 'jpg';
          else if (targetMimeType === 'image/png') newExtension = 'png';

          const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const newFileName = `${baseName}.${newExtension}`;

          const compressedFile = new File([blob], newFileName, {
            type: targetMimeType,
            lastModified: Date.now(),
          });

          const compressedSize = compressedFile.size;
          const savingsPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

          resolve({
            file: compressedFile,
            originalSize,
            compressedSize,
            savingsPercent,
            width: targetWidth,
            height: targetHeight,
            wasCompressed: true,
          });
        },
        targetMimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        file,
        originalSize,
        compressedSize: originalSize,
        savingsPercent: 0,
        width: 0,
        height: 0,
        wasCompressed: false,
      });
    };

    img.src = objectUrl;
  });
}
