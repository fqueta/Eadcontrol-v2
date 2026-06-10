import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Plus, 
  Code, 
  Eye, 
  AlertCircle,
  Menu,
  Sparkles
} from 'lucide-react';

interface MenuItem {
  label: string;
  url: string;
  auth: boolean;
}

interface MenuBuilderProps {
  value: string;
  onChange: (value: string) => void;
}

export function MenuBuilder({ value, onChange }: MenuBuilderProps) {
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');

  // Sincroniza valor recebido com o estado interno
  useEffect(() => {
    setRawText(value || '[]');
    try {
      const parsed = JSON.parse(value || '[]');
      if (Array.isArray(parsed)) {
        // Valida se cada item tem o formato correto
        const sanitized = parsed.map((item: any) => ({
          label: String(item.label || ''),
          url: String(item.url || ''),
          auth: Boolean(item.auth),
        }));
        setItems(sanitized);
        setError(null);
      } else {
        throw new Error('O JSON deve ser um array de links.');
      }
    } catch (e: any) {
      setError(e.message || 'JSON inválido');
      // Força modo código se houver um erro de parser do JSON vindo de fora
      setMode('code');
    }
  }, [value]);

  const updateParent = (newItems: MenuItem[]) => {
    setItems(newItems);
    onChange(JSON.stringify(newItems));
  };

  const handleAddItem = () => {
    const newItems = [...items, { label: 'Novo Link', url: '/', auth: false }];
    updateParent(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (!window.confirm('Tem certeza que deseja remover este item de menu?')) return;
    const newItems = items.filter((_, i) => i !== index);
    updateParent(newItems);
  };

  const handleUpdateItem = (index: number, field: keyof MenuItem, val: any) => {
    const newItems = items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: val };
      }
      return item;
    });
    updateParent(newItems);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    updateParent(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    updateParent(newItems);
  };

  const handleRawChange = (val: string) => {
    setRawText(val);
    onChange(val);
    try {
      const parsed = JSON.parse(val || '[]');
      if (Array.isArray(parsed)) {
        setError(null);
      } else {
        setError('O JSON deve ser um array de links.');
      }
    } catch (e: any) {
      setError(e.message || 'JSON inválido');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <Menu className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-black text-slate-800 dark:text-slate-200">
            Editor de Menu do Topo
          </span>
        </div>
        <div className="flex bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => {
              if (error) {
                alert('Corrija o erro no JSON antes de alternar para o Construtor Visual.');
                return;
              }
              setMode('visual');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-md transition-all ${
              mode === 'visual'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Visual
          </button>
          <button
            type="button"
            onClick={() => setMode('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-md transition-all ${
              mode === 'code'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Code className="h-3.5 w-3.5" />
            Código JSON
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-3">
                Nenhum link adicionado ao menu ainda.
              </p>
              <Button onClick={handleAddItem} variant="outline" size="sm" className="font-bold border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Plus className="h-4 w-4 mr-2" /> Adicionar Primeiro Link
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {items.map((item, index) => (
                  <div 
                    key={index}
                    className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all"
                  >
                    {/* Badge de ordenação e controle */}
                    <div className="flex md:flex-col gap-1 items-center justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="h-7 w-7 p-0 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <span className="text-[10px] font-black text-slate-400 select-none">
                        {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === items.length - 1}
                        className="h-7 w-7 p-0 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Inputs de label e URL */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                          Rótulo / Texto do Link
                        </Label>
                        <Input
                          value={item.label}
                          onChange={(e) => handleUpdateItem(index, 'label', e.target.value)}
                          className="h-9 font-bold text-sm"
                          placeholder="Ex: Cursos, Início"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                          URL / Rota
                        </Label>
                        <Input
                          value={item.url}
                          onChange={(e) => handleUpdateItem(index, 'url', e.target.value)}
                          className="h-9 text-sm"
                          placeholder="Ex: /, /cursos, /aluno"
                        />
                      </div>
                    </div>

                    {/* Opções de visualização/auth e delete */}
                    <div className="flex items-center gap-6 justify-between w-full md:w-auto border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <div className="text-right">
                          <Label className="text-xs font-bold block leading-none">
                            Apenas Logados
                          </Label>
                          <span className="text-[9px] font-black uppercase text-slate-400">
                            Requer Auth
                          </span>
                        </div>
                        <Switch
                          checked={item.auth}
                          onCheckedChange={(val) => handleUpdateItem(index, 'auth', val)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                        title="Remover link"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-start">
                <Button 
                  type="button"
                  onClick={handleAddItem}
                  variant="outline"
                  className="font-bold border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 h-10 px-5 rounded-xl transition-all"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Novo Link
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[10px] font-black uppercase text-slate-400">
              Formato JSON Manual
            </Label>
            <Textarea
              value={rawText}
              onChange={(e) => handleRawChange(e.target.value)}
              className="font-mono text-sm min-h-[220px] rounded-2xl focus:ring-2 focus:ring-indigo-500"
              placeholder='[{"label":"Início","url":"/","auth":false}]'
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/25 text-red-600 dark:text-red-400 p-3.5 rounded-xl border border-red-100 dark:border-red-950/40 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Erro de sintaxe no JSON: {error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
