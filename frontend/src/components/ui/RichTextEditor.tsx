import React, { useEffect, useRef } from 'react';
import { 
  Bold, Italic, Underline, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Type
} from 'lucide-react';

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
 * ToolbarButton
 * pt-BR: Botão auxiliar para a toolbar do editor, garantindo estilo consistente.
 * en-US: Helper button for the editor toolbar, ensuring consistent styling.
 */
const ToolbarButton: React.FC<{ 
  onClick: () => void, 
  title: string, 
  disabled?: boolean, 
  active?: boolean,
  children: React.ReactNode 
}> = ({ onClick, title, disabled, active, children }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`p-1.5 rounded-md transition-all border shadow-sm ${
      active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent border-input'
    } disabled:opacity-50 disabled:pointer-events-none`}
  >
    {children}
  </button>
);

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
      <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-muted/30">
        <div className="flex items-center border-r pr-1 mr-1 gap-1">
          <ToolbarButton onClick={() => execCmd('bold')} title="Negrito" disabled={disabled} active={document.queryCommandState?.('bold')}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => execCmd('italic')} title="Itálico" disabled={disabled} active={document.queryCommandState?.('italic')}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => execCmd('underline')} title="Sublinhado" disabled={disabled} active={document.queryCommandState?.('underline')}><Underline className="h-4 w-4" /></ToolbarButton>
        </div>
        
        <div className="flex items-center border-r pr-1 mr-1 gap-1">
          <ToolbarButton onClick={() => execCmd('insertUnorderedList')} title="Lista" disabled={disabled}><List className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => execCmd('insertOrderedList')} title="Lista Numerada" disabled={disabled}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        </div>

        <div className="flex items-center border-r pr-1 mr-1 gap-1">
          <ToolbarButton onClick={() => applyAlignment('left')} title="Alinhar à esquerda" disabled={disabled}><AlignLeft className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => applyAlignment('center')} title="Centralizar" disabled={disabled}><AlignCenter className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => applyAlignment('right')} title="Alinhar à direita" disabled={disabled}><AlignRight className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => applyAlignment('justify')} title="Justificar" disabled={disabled}><AlignJustify className="h-4 w-4" /></ToolbarButton>
        </div>

        <ToolbarButton onClick={() => execCmd('formatBlock', 'p')} title="Texto Normal" disabled={disabled}><Type className="h-4 w-4" /></ToolbarButton>
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