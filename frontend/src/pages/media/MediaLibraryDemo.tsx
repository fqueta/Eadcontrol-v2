import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MediaLibraryModal } from "@/components/media/MediaLibraryModal";
import { fileStorageService, type FileStorageItem } from "@/services/fileStorageService";
import { Download } from "lucide-react";

/**
 * MediaLibraryDemo
 * pt-BR: Página de demonstração para a Biblioteca de Mídia, similar ao WordPress.
 *        Permite abrir o modal, selecionar um item e visualizar/baixar o arquivo.
 * en-US: Demo page for the Media Library, WordPress-like.
 *        Allows opening the modal, selecting an item, and previewing/downloading the file.
 */
export default function MediaLibraryDemo() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FileStorageItem | null>(null);

  /**
   * handleSelect
   * pt-BR: Manipula a seleção de um item na biblioteca e fecha o modal.
   * en-US: Handles selection of a library item and closes the modal.
   */
  const handleSelect = (item: FileStorageItem) => {
    setSelected(item);
    setOpen(false);
  };

  /**
   * isImage
   * pt-BR: Verifica se o item selecionado é uma imagem pelo MIME.
   * en-US: Checks if the selected item is an image by MIME.
   */
  const isImage = (item: FileStorageItem | null) =>
    !!item && String(item.file?.mime || item.mime || "").startsWith("image/");

  /**
   * downloadUrl
   * pt-BR: Gera a URL de download para o item selecionado.
   * en-US: Generates the download URL for the selected item.
   */
  const downloadUrl = useMemo(() =>
    selected ? fileStorageService.downloadUrl(selected.id) : "",
  [selected]);

  /**
   * handleDownload
   * pt-BR: Realiza download autenticado do arquivo selecionado usando Blob.
   *        Evita falhas de autorização que ocorrem com links diretos sem headers.
   * en-US: Performs authenticated download of the selected file using Blob.
   *        Avoids authorization failures from direct links without headers.
   */
  const handleDownload = async () => {
    if (!selected) return;
    await fileStorageService.download(selected.id, selected.file?.original || selected.title || undefined);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Demo: Biblioteca de Mídia</h1>
        <Button onClick={() => setOpen(true)}>Abrir Biblioteca</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          {!selected && (
            <div className="text-sm text-muted-foreground">
              Nenhum item selecionado. Clique em "Abrir Biblioteca" para escolher.
            </div>
          )}

          {selected && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div className="md:col-span-1">
                <div className="aspect-square bg-muted rounded-md overflow-hidden flex items-center justify-center">
                  {isImage(selected) ? (
                    <img
                      src={selected.file?.url || selected.url || ""}
                      alt={selected.title || selected.file?.original || "imagem"}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 text-center">Prévia indisponível</div>
                  )}
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <div>
                  <div className="text-sm font-medium">Título</div>
                  <div className="text-sm">{selected.title || selected.file?.original || `#${selected.id}`}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">MIME</div>
                  <div className="text-sm">{selected.file?.mime || selected.mime || "arquivo"}</div>
                </div>
                <div className="flex gap-2">
                  {downloadUrl && (
                    <Button variant="outline" size="sm" onClick={handleDownload} title="Baixar arquivo">
                      <Download className="h-4 w-4 mr-2" /> Baixar arquivo
                    </Button>
                  )}
                  {selected.file?.url && (
                    <a href={selected.file.url} target="_blank" rel="noreferrer" className="underline text-primary text-sm">
                      Abrir URL pública
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <MediaLibraryModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
        defaultFilters={{ mime: "image/" }}
      />
    </div>
  );
}