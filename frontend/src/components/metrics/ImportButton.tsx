import React from 'react';
import { Download, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

// Interface deve vir após os imports
interface ImportButtonProps {
  onImport: (tipo: string, inicio?: string | Date, fim?: string | Date) => void;
  inicio: string | Date;
  fim: string | Date;
  isLoading: boolean;
}

/**
 * Componente de botão dropdown para importação de dados
 * Permite selecionar diferentes tipos de importação com parâmetros de data
 */
const ImportButton: React.FC<ImportButtonProps> = ({ onImport, inicio, fim, isLoading }) => {
  
    return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex-1 sm:flex-none" disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{isLoading ? 'Importando...' : 'Importar'}</span>
          <span className="sm:hidden">{isLoading ? 'Import...' : 'Import'}</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onImport('investimentos', inicio, fim)}>
          Investimentos
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onImport('visitas', inicio, fim)}>
          Visitas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onImport('atendimento', inicio, fim)}>
          Atendimento
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onImport('proposta', inicio, fim)}>
          Proposta & Fechamentos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ImportButton;