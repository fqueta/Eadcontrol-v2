import React, { useEffect, useRef } from 'react';

/**
 * RichTextEditor
 * pt-BR: Editor WYSIWYG simples baseado em `contenteditable`, com toolbar básica.
 * en-US: Simple WYSIWYG editor using `contenteditable`, with a basic toolbar.
 */
export interface RichTextEditorProps {
  /** Valor HTML atual do editor */
  value: string;
  /** Dispara quando o conteúdo muda; retorna HTML */
  onChange: (html: string) => void;
  /** Placeholder exibido quando vazio */
  placeholder?: string;
  /** Desabilita edição quando true */
  disabled?: boolean;
}

/**
 * execCmd
 * pt-BR: Executa comando de formatação do documento.
 * en-US: Executes document formatting command.
 */
function execCmd(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, disabled }) => {
  const ref = useRef<HTMLDivElement>(null);

  /**
   * useEffect sync
   * pt-BR: Sincroniza valor externo com o conteúdo do editor.
   * en-US: Sync external value with editor content.
   */
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  /**
   * applyAlignment
   * pt-BR: Aplica alinhamento de texto usando comandos de edição do documento.
   * en-US: Applies text alignment using document editing commands.
   */
  function applyAlignment(alignment: 'left' | 'center' | 'right' | 'justify') {
    switch (alignment) {
      case 'left':
        execCmd('justifyLeft');
        break;
      case 'center':
        execCmd('justifyCenter');
        break;
      case 'right':
        execCmd('justifyRight');
        break;
      case 'justify':
        execCmd('justifyFull');
        break;
      default:
        break;
    }
  }

  /**
   * handleInput
   * pt-BR: Emite HTML atualizado quando há alterações.
   * en-US: Emits updated HTML on changes.
   */
  const handleInput = () => {
    const html = ref.current?.innerHTML || '';
    onChange(html);
  };

  return (
    <div className="border rounded-md">
      {/* Toolbar */}
      <div className="flex gap-2 p-2 border-b bg-muted">
        <button type="button" className="text-sm px-2 py-1 rounded hover:bg-muted-foreground/10" onClick={() => execCmd('bold')} disabled={disabled}>B</button>
        <button type="button" className="text-sm px-2 py-1 rounded hover:bg-muted-foreground/10" onClick={() => execCmd('italic')} disabled={disabled}>I</button>
        <button type="button" className="text-sm px-2 py-1 rounded hover:bg-muted-foreground/10" onClick={() => execCmd('underline')} disabled={disabled}>U</button>
        <button type="button" className="text-sm px-2 py-1 rounded hover:bg-muted-foreground/10" onClick={() => execCmd('insertUnorderedList')} disabled={disabled}>• Lista</button>
        <button type="button" className="text-sm px-2 py-1 rounded hover:bg-muted-foreground/10" onClick={() => execCmd('insertOrderedList')} disabled={disabled}>1. Lista</button>
        <button type="button" className="text-sm px-2 py-1 rounded hover:bg-muted-foreground/10" onClick={() => execCmd('formatBlock', 'p')} disabled={disabled}>Parágrafo</button>
        {/* Alignment controls */}
        <span className="mx-2 w-px bg-border" />
        <button type="button" title="Alinhar à esquerda" className="text-sm px-2 py-1 rounded hover:bg-muted-foreground/10" onClick={() => applyAlignment('left')} disabled={disabled}>Esq</button>
        <button type="button" title="Centralizar" className="text-sm px-2 py-1 rounded hover:bg-muted-foreground/10" onClick={() => applyAlignment('center')} disabled={disabled}>Centro</button>
        <button type="button" title="Alinhar à direita" className="text-sm px-2 py-1 rounded hover:bg-muted-foreground/10" onClick={() => applyAlignment('right')} disabled={disabled}>Dir</button>
        <button type="button" title="Justificar" className="text-sm px-2 py-1 rounded hover:bg-muted-foreground/10" onClick={() => applyAlignment('justify')} disabled={disabled}>Justificar</button>
      </div>
      {/* Editable area */}
      <div
        ref={ref}
        contentEditable={!disabled}
        onInput={handleInput}
        className="min-h-[120px] p-3 text-sm"
        data-placeholder={placeholder || ''}
        suppressContentEditableWarning
      />
    </div>
  );
};

export default RichTextEditor;