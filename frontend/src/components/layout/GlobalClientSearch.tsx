import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  X,
  Clock,
  Trash2,
  User,
  Mail,
  Phone,
  FileText,
  ExternalLink,
  Edit,
  Loader2,
  Users,
  Keyboard,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { clientsService } from "@/services/clientsService";
import { ClientRecord } from "@/types/clients";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Chave do localStorage para o histórico de consultas.
 * Incluímos o tenant para evitar mistura entre tenants.
 */
const HISTORY_STORAGE_KEY = "global_client_search_history";
const MAX_HISTORY_ITEMS = 20;

/**
 * Interface para cada entrada do histórico de consultas recentes.
 */
interface SearchHistoryEntry {
  id: string;
  name: string;
  email?: string;
  cpf?: string | null;
  celular?: string | null;
  searchedAt: string; // ISO string
  searchedBy?: string;
}

/**
 * Retorna as iniciais de um nome (até 2 letras).
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

/**
 * Formata uma data ISO para exibição compacta no padrão brasileiro.
 */
function formatSearchDate(isoStr: string): string {
  const date = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHrs < 24) return `${diffHrs}h atrás`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Aplica máscara de CPF (###.###.###-##).
 */
function formatCpf(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// ─── Hooks de Histórico ──────────────────────────────────────────────────────

function loadHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: SearchHistoryEntry[]) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

// ─── Componente Principal ────────────────────────────────────────────────────

interface GlobalClientSearchProps {
  /**
   * Controle externo de abertura (botão da header, por ex.)
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GlobalClientSearch({
  open: controlledOpen,
  onOpenChange,
}: GlobalClientSearchProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estado do modal
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (v: boolean) => {
      if (onOpenChange) onOpenChange(v);
      else setInternalOpen(v);
    },
    [onOpenChange]
  );

  // Busca
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [results, setResults] = useState<ClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Histórico
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadHistory);

  // Navegação por teclado
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Atalho global: Ctrl+Espaço ────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        setOpen(!isOpen);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setOpen]);

  // ── Reset ao abrir/fechar ─────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setResults([]);
      setHasSearched(false);
      setActiveIndex(-1);
      setHistory(loadHistory());
      // Auto-focus no input após a animação
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ── Buscar na API ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    clientsService
      .listClients({ search: debouncedSearch.trim(), per_page: 10 })
      .then((res) => {
        if (!cancelled) {
          setResults(res.data || []);
          setHasSearched(true);
          setActiveIndex(-1);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setHasSearched(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  // ── Navegação por teclado ─────────────────────────────────────────────────
  const totalItems = searchTerm.trim().length >= 2 ? results.length : history.length;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      if (searchTerm.trim().length >= 2 && results[activeIndex]) {
        handleSelectClient(results[activeIndex]);
      } else if (history[activeIndex]) {
        handleSelectFromHistory(history[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Scroll ativo para o item selecionado
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-search-item]");
      items[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // ── Adicionar ao histórico ────────────────────────────────────────────────
  function addToHistory(client: ClientRecord) {
    const entry: SearchHistoryEntry = {
      id: client.id,
      name: client.name,
      email: client.email,
      cpf: client.cpf,
      celular: client.config?.celular || client.celular,
      searchedAt: new Date().toISOString(),
      searchedBy: user?.name || "Operador",
    };

    const updated = [entry, ...history.filter((h) => h.id !== client.id)].slice(
      0,
      MAX_HISTORY_ITEMS
    );
    setHistory(updated);
    saveHistory(updated);
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  // ── Navegar para o cliente ────────────────────────────────────────────────
  function handleSelectClient(client: ClientRecord) {
    addToHistory(client);
    setOpen(false);
    navigate(`/admin/clients/${client.id}/view`);
  }

  function handleEditClient(e: React.MouseEvent, clientId: string) {
    e.stopPropagation();
    setOpen(false);
    navigate(`/admin/clients/${clientId}/edit`);
  }

  function handleSelectFromHistory(entry: SearchHistoryEntry) {
    setOpen(false);
    navigate(`/admin/clients/${entry.id}/view`);
  }

  // ── Determinar o que renderizar ───────────────────────────────────────────
  const showResults = searchTerm.trim().length >= 2;
  const showHistory = !showResults && history.length > 0;
  const showEmpty = showResults && hasSearched && !isLoading && results.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent
        className={cn(
          "sm:max-w-[800px] p-0 gap-0 overflow-hidden",
          "border-border/50 shadow-2xl",
          "[&>button]:!hidden" // Força a ocultação do X padrão do Dialog
        )}
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Buscar Cliente</DialogTitle>
          <DialogDescription>Pesquise clientes por nome, email, CPF, celular ou ID</DialogDescription>
        </DialogHeader>

        {/* ── Barra de Busca ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar cliente por nome, email, CPF, celular ou ID..."
            className="border-0 shadow-none focus-visible:ring-0 h-10 text-base placeholder:text-muted-foreground/60"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => {
                setSearchTerm("");
                setResults([]);
                setHasSearched(false);
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          )}
        </div>

        {/* ── Corpo ────────────────────────────────────────────────────── */}
        <div
          ref={listRef}
          className="max-h-[400px] overflow-y-auto overscroll-contain"
        >
          {/* Consultas Recentes */}
          {showHistory && (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Consultas Recentes
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1"
                  onClick={clearHistory}
                >
                  <Trash2 className="h-3 w-3" />
                  Limpar
                </Button>
              </div>
              <Separator className="mb-1 opacity-50" />
              {history.map((entry, idx) => (
                <div
                  key={`hist-${entry.id}-${idx}`}
                  data-search-item
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                    "hover:bg-accent/50",
                    activeIndex === idx && "bg-accent"
                  )}
                  onClick={() => handleSelectFromHistory(entry)}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {getInitials(entry.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {entry.name}
                      </span>
                      {entry.cpf && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          Doc: {formatCpf(entry.cpf)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {entry.email && (
                        <span className="truncate">{entry.email}</span>
                      )}
                      {entry.celular && (
                        <span className="shrink-0">{entry.celular}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] text-muted-foreground">
                      {formatSearchDate(entry.searchedAt)}
                    </div>
                    {entry.searchedBy && (
                      <div className="text-[10px] text-muted-foreground/60">
                        {entry.searchedBy}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resultados da Busca */}
          {showResults && !isLoading && results.length > 0 && (
            <div className="py-2">
              <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                {results.length} resultado{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}
              </div>
              <Separator className="mb-1 opacity-50" />
              {results.map((client, idx) => (
                <div
                  key={client.id}
                  data-search-item
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-all group",
                    "hover:bg-accent/50",
                    activeIndex === idx && "bg-accent"
                  )}
                  onClick={() => handleSelectClient(client)}
                >
                  <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/10 transition-all group-hover:ring-primary/30">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-bold">
                      {getInitials(client.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">
                        {client.name}
                      </span>
                      <Badge
                        variant={client.status === "actived" ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                      >
                        {client.status === "actived" ? "Ativo" : client.status === "inactived" ? "Inativo" : "Pré-cadastro"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {client.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          {client.email}
                        </span>
                      )}
                      {(client.cpf || client.cnpj) && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <FileText className="h-3 w-3" />
                          {client.cpf ? formatCpf(client.cpf) : client.cnpj}
                        </span>
                      )}
                    </div>
                    {(client.config?.celular || client.celular) && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        {client.config?.celular || client.celular}
                      </span>
                    )}
                  </div>

                  {/* Ações rápidas */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Ver perfil"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectClient(client);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar cliente"
                      onClick={(e) => handleEditClient(e, client.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading Skeleton */}
          {showResults && isLoading && (
            <div className="py-4 space-y-3 px-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Nenhum resultado */}
          {showEmpty && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Nenhum cliente encontrado
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Tente buscar por nome, email, CPF ou celular
              </p>
            </div>
          )}

          {/* Estado inicial (sem busca, sem histórico) */}
          {!showResults && !showHistory && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Pesquise clientes rapidamente
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Digite pelo menos 2 caracteres para buscar
              </p>
            </div>
          )}
        </div>

        {/* ── Rodapé com dicas ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-muted/30">
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono">↓</kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono">Enter</kbd>
              Selecionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono">Esc</kbd>
              Fechar
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Keyboard className="h-3 w-3" />
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono">Ctrl</kbd>
            +
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-mono">Espaço</kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
