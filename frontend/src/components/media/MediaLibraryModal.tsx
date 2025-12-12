import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { fileStorageService, type FileStorageItem, type FileStorageListParams } from '@/services/fileStorageService';
import { Image as ImageIcon, File as FileIcon, RefreshCw, Trash2 } from 'lucide-react';

/**
 * MediaLibraryModalProps
 * pt-BR: Propriedades do modal de biblioteca de mídia (semelhante ao WordPress).
 * en-US: Props for the media library modal (WordPress-like).
 */
export interface MediaLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: FileStorageItem) => void;
  /**
   * pt-BR: Filtrar por MIME/Extensão inicialmente (ex.: imagens).
   * en-US: Initially filter by MIME/Ext (e.g., images).
   */
  defaultFilters?: Partial<Pick<FileStorageListParams, 'mime' | 'ext' | 'active'>>;
}

/**
 * MediaLibraryModal
 * pt-BR: Modal para listar, filtrar, enviar e selecionar arquivos/imagens usando o backend `file-storage`.
 * en-US: Modal to list, filter, upload and select files/images using the `file-storage` backend.
 */
export function MediaLibraryModal({ open, onClose, onSelect, defaultFilters }: MediaLibraryModalProps) {
  const [items, setItems] = useState<FileStorageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [mime, setMime] = useState<string | undefined>(defaultFilters?.mime);
  const [ext, setExt] = useState<string | undefined>(defaultFilters?.ext);
  const [active, setActive] = useState<boolean | undefined>(defaultFilters?.active);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  /**
   * loadLibrary
   * pt-BR: Carrega itens da biblioteca com filtros e paginação.
   * en-US: Loads library items with filters and pagination.
   */
  const loadLibrary = async () => {
    try {
      setIsLoading(true);
      const res = await fileStorageService.list({
        page,
        per_page: perPage,
        q: search || undefined,
        mime: mime || undefined,
        ext: ext || undefined,
        active: typeof active === 'boolean' ? active : undefined,
        order_by: 'created_at',
        order: 'desc',
      });
      setItems(res.data);
      setTotalPages(res.meta?.last_page || 1);
    } catch (error) {
      console.error('Falha ao carregar biblioteca:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadLibrary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page, perPage, search, mime, ext, active]);

  /**
   * handleUpload
   * pt-BR: Envia um novo arquivo e atualiza a listagem.
   * en-US: Uploads a new file and refreshes the listing.
   */
  const handleUpload = async () => {
    if (!uploadFile) return;
    try {
      setUploading(true);
      await fileStorageService.upload(uploadFile, {
        title: uploadTitle || undefined,
        active: true,
      });
      setUploadFile(null);
      setUploadTitle('');
      // Volta para primeira página para ver o item novo
      setPage(1);
      await loadLibrary();
    } catch (error) {
      console.error('Falha no upload:', error);
    } finally {
      setUploading(false);
    }
  };

  /**
   * handleFilePicked
   * pt-BR: Define o arquivo selecionado para upload.
   * en-US: Sets the picked file to be uploaded.
   */
  const handleFilePicked = (file: File | null) => {
    setUploadFile(file);
  };

  /**
   * handleInputChange
   * pt-BR: Captura arquivo do input oculto.
   * en-US: Captures file from the hidden input.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFilePicked(file);
  };

  /**
   * handleDelete
   * pt-BR: Exclui (soft-delete) um item da biblioteca e recarrega a lista.
   * en-US: Soft-deletes a library item and reloads the list.
   */
  const handleDelete = async (itemId: number | string) => {
    const ok = window.confirm('Excluir este arquivo da biblioteca?');
    if (!ok) return;
    try {
      setDeletingId(itemId);
      await fileStorageService.deleteById(itemId);
      // Mantém a mesma página, apenas recarrega
      await loadLibrary();
    } catch (error) {
      console.error('Falha ao excluir arquivo:', error);
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * openFileDialog
   * pt-BR: Abre o seletor de arquivos ao clicar na área.
   * en-US: Opens the file chooser when clicking the area.
   */
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  /**
   * Drag & Drop handlers
   * pt-BR: Manipula eventos de arrastar/soltar na área de upload.
   * en-US: Handles drag and drop events on the upload area.
   */
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingUpload(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingUpload(false);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingUpload(false);
    const file = e.dataTransfer.files?.[0] || null;
    handleFilePicked(file);
  };

  const isImage = (item: FileStorageItem) => String(item?.file?.mime || item?.mime || '').startsWith('image/');

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : void 0)}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogTitle>Biblioteca de Mídia</DialogTitle>
        <div className="grid grid-cols-1 gap-4">
          {/* Filtros e Busca */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Pesquisar por título"
              className="w-48"
            />
            <Select value={mime ?? 'all'} onValueChange={(v) => { setMime(v === 'all' ? undefined : v); setPage(1); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="MIME" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="image/">Imagens</SelectItem>
                <SelectItem value="application/pdf">PDF</SelectItem>
                <SelectItem value="video/">Vídeos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ext ?? 'all'} onValueChange={(v) => { setExt(v === 'all' ? undefined : v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Extensão" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="webp">WEBP</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeof active === 'boolean' ? (active ? 's' : 'n') : 'all'} onValueChange={(v) => { setActive(v === 'all' ? undefined : v === 's'); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="s">Ativos</SelectItem>
                <SelectItem value="n">Rascunho</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadLibrary} disabled={isLoading}>
              <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-24"><SelectValue placeholder="Página" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="24">24</SelectItem>
                  <SelectItem value="48">48</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">Página {page} de {totalPages}</div>
            </div>
          </div>

          {/* Upload Rápido (Dropzone) */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div
                  className={
                    `flex-1 border-2 border-dashed rounded-md p-4 cursor-pointer transition-colors ` +
                    (isDraggingUpload ? 'border-purple-500 bg-purple-50' : 'border-muted')
                  }
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={openFileDialog}
                  title="Arraste e solte um arquivo ou clique para escolher"
                >
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    {uploadFile ? (
                      <div className="text-sm">
                        <div className="font-medium">{uploadFile.name}</div>
                        <div className="text-xs text-muted-foreground">{Math.round(uploadFile.size / 1024)} KB</div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-purple-600">Clique para enviar</span>
                        <span> ou arraste um arquivo aqui</span>
                      </div>
                    )}
                  </div>
                  {/* Input oculto para fallback */}
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="*/*"
                    onChange={handleInputChange}
                    className="hidden"
                  />
                </div>
                <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Título (opcional)" className="max-w-xs" />
                <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
                  {uploading ? 'Enviando…' : 'Enviar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Grid de Itens */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {isLoading && (
              <div className="col-span-full text-center text-sm text-muted-foreground">Carregando…</div>
            )}
            {!isLoading && items.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground">Nenhum item encontrado.</div>
            )}
            {!isLoading && items.map((item) => (
              <button
                key={String(item.id)}
                type="button"
                onClick={() => onSelect(item)}
                className="relative border rounded-md overflow-hidden hover:shadow focus:outline-none"
                title={item.title || item.file?.original || String(item.id)}
              >
                {/* Botão excluir (overlay) */}
                <div className="absolute top-2 right-2 z-10">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    title="Excluir"
                    disabled={deletingId === item.id}
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="aspect-square bg-muted flex items-center justify-center">
                  {isImage(item) ? (
                    <img
                      src={item.file?.url || item.url || ''}
                      alt={item.title || item.file?.original || 'imagem'}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center text-muted-foreground">
                      <FileIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-2 text-left">
                  <div className="text-xs font-medium truncate">{item.title || item.file?.original || `#${item.id}`}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{item.file?.mime || item.mime || 'arquivo'}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || isLoading}>Próxima</Button>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MediaLibraryModal;