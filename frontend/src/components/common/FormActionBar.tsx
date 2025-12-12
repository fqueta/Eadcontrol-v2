import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, X } from "lucide-react";

/**
 * FormActionBar
 *
 * Componente reutilizável para barras de ação de formulários.
 * - Modo "create": botão Voltar à esquerda e ações "Salvar e continuar" e "Salvar e sair" à direita.
 * - Modo "edit": ações "Cancelar" e botão de envio "Salvar Alterações".
 * - Pode ser renderizado fixo no rodapé (fixed=true) ou inline com borda superior (fixed=false).
 *
 * English: Reusable action bar for forms. Supports create/edit modes and
 * fixed or inline rendering, consolidating navigation and save actions.
 */
export function FormActionBar({
  mode = "create",
  fixed = true,
  onBack,
  onSaveContinue,
  onSaveExit,
  onCancel,
  isLoading = false,
  className,
  labels,
  showSaveContinue = true,
  showSaveExit = true,
  showCancel = true,
  showSubmit = true,
}: {
  mode?: "create" | "edit";
  fixed?: boolean;
  onBack?: () => void;
  onSaveContinue?: () => void;
  onSaveExit?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
  labels?: Partial<{
    back: string;
    saveContinue: string;
    saveExit: string;
    cancel: string;
    saveEdit: string;
  }>;
  showSaveContinue?: boolean; // Oculta/mostra ação "Salvar e continuar" (create)
  showSaveExit?: boolean;     // Oculta/mostra ação "Salvar e sair" (create)
  showCancel?: boolean;       // Oculta/mostra ação "Cancelar" (edit)
  showSubmit?: boolean;       // Oculta/mostra botão de submit (edit)
}) {
  const backLabel = labels?.back ?? "Voltar";
  const saveContinueLabel = labels?.saveContinue ?? "Salvar e continuar";
  const saveExitLabel = labels?.saveExit ?? "Salvar e sair";
  const cancelLabel = labels?.cancel ?? "Cancelar";
  const saveEditLabel = labels?.saveEdit ?? "Salvar Alterações";

  const fixedWrapper = (
    <div className={`fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 ${className ?? ""}`}>
      <div className="container mx-auto py-3 flex items-center justify-between gap-2">
        {/* Left side (Back) for create mode */}
        {mode === "create" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {mode === "create" ? (
            <>
              {showSaveContinue && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSaveContinue}
                  className="flex items-center gap-2"
                  type="button"
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4" />
                  {saveContinueLabel}
                </Button>
              )}
              {showSaveExit && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onSaveExit}
                  className="flex items-center gap-2"
                  type="button"
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4" />
                  {saveExitLabel}
                </Button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              {showCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  <X className="mr-2 h-4 w-4" />
                  {cancelLabel}
                </Button>
              )}
              {showSubmit && (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {saveEditLabel}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const inlineWrapper = (
    <div className={`flex items-center justify-end space-x-4 pt-6 border-t ${className ?? ""}`}>
      {mode === "create" ? (
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
          <div className="flex items-center gap-2">
            {showSaveContinue && (
              <Button
                variant="default"
                size="sm"
                onClick={onSaveContinue}
                className="flex items-center gap-2"
                type="button"
                disabled={isLoading}
              >
                <Save className="h-4 w-4" />
                {saveContinueLabel}
              </Button>
            )}
            {showSaveExit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onSaveExit}
                className="flex items-center gap-2"
                type="button"
                disabled={isLoading}
              >
                <Save className="h-4 w-4" />
                {saveExitLabel}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {showCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              <X className="mr-2 h-4 w-4" />
              {cancelLabel}
            </Button>
          )}
          {showSubmit && (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {saveEditLabel}
                </>
              )}
            </Button>
          )}
        </>
      )}
    </div>
  );

  return fixed ? fixedWrapper : inlineWrapper;
}