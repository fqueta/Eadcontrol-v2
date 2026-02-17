import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePagesApi } from "@/hooks/pages";
import type { Page } from "@/services/pagesService";
import { useNavigate, Link } from "react-router-dom";
import { 
  Eye, 
  EyeOff, 
  LayoutTemplate, 
  Plus, 
  ChevronRight, 
  MoreHorizontal, 
  ExternalLink, 
  Copy, 
  Trash2, 
  Edit3, 
  Globe 
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const pageSchema = z.object({
  name: z.string().min(2),
  content: z.string().optional(),
  active: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type PageFormData = z.infer<typeof pageSchema>;

export default function MenusSite() {
  const { useList, useCreate, useUpdate, useDelete } = usePagesApi();
  const { data, isLoading, error } = useList({ per_page: 10, order_by: "created_at", order: "desc" });
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const deleteMutation = useDelete();
  const navigate = useNavigate();

  const pages = useMemo(() => {
    const arr = data?.data || [];
    return Array.isArray(arr) ? arr : [];
  }, [data]);

  const handleDelete = async (id: string | number) => {
    try {
      await deleteMutation.mutateAsync(String(id));
      toast.success("Página excluída com sucesso");
    } catch (err) {
      toast.error("Erro ao excluir página");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground/60">
            <Link to="/admin" className="hover:text-primary transition-colors">Administração</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-primary italic">Páginas</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <LayoutTemplate className="h-8 w-8 text-primary" />
            Páginas do Site
          </h1>
          <p className="text-sm font-medium text-muted-foreground">Gerencie as páginas institucionais e o conteúdo público da sua escola.</p>
        </div>
        <Button 
          onClick={() => navigate("/admin/site/pages/create")}
          className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-black shadow-lg shadow-primary/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Nova Página
        </Button>
      </div>

      {/* Main Container */}
      <div className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Lista de Páginas</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                {pages.length} {pages.length === 1 ? 'página cadastrada' : 'páginas cadastradas'}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-muted-foreground/50 px-8">Título</TableHead>
                <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-muted-foreground/50">Slug / URL</TableHead>
                <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-muted-foreground/50 text-center">Status</TableHead>
                <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest text-muted-foreground/50 text-right px-8">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-slate-50 dark:border-slate-800/50">
                    <TableCell colSpan={4} className="h-20 px-8">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                          <div className="h-3 w-32 bg-slate-50 dark:bg-slate-800/50 rounded animate-pulse" />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : pages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-60 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                      <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <LayoutTemplate className="h-8 w-8" />
                      </div>
                      <p className="font-bold">Nenhuma página encontrada</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pages.map((p) => (
                  <TableRow key={String(p.id)} className="group border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <TableCell className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                          <Globe className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 dark:text-slate-100 transition-colors group-hover:text-primary">{p.title}</span>
                          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight">ID: {p.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-[11px] font-mono bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800 text-muted-foreground capitalize">
                        /{p.slug}
                      </code>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={p.active ? "default" : "secondary"}
                        className={`rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-widest gap-1.5 transition-all
                          ${p.active 
                            ? "bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/10" 
                            : "bg-slate-100 text-slate-500 border-none opacity-60"}
                        `}
                      >
                        {p.active ? (
                          <>
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Publicado
                          </>
                        ) : (
                          <>
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Rascunho
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/admin/site/pages/${p.id}/edit`)}
                          className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => navigate(`/pagina/${p.slug}`)}
                          disabled={!p.active}
                          className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            const full = `${window.location.host}/pagina/${p.slug}`;
                            navigator.clipboard.writeText(full).then(
                              () => toast.success("Link copiado"),
                              () => toast.error("Erro ao copiar")
                            );
                          }}
                          disabled={!p.active}
                          className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-teal-600 hover:bg-teal-50"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 py-1.5">Opções</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
                            <DropdownMenuItem 
                              className="rounded-xl font-bold gap-2 cursor-pointer"
                              onClick={() => navigate(`/pagina/${p.slug}`)}
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                              Visualizar Site
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="rounded-xl font-bold gap-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                              onClick={() => handleDelete(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir Página
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
