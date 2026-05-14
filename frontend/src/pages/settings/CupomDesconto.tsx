import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Pencil, Trash2, Eye, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cupomService, CupomRecord } from "@/services/cupomService";

export default function CupomDesconto() {
  const navigate = useNavigate();
  const [cupons, setCupons] = useState<CupomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<CupomRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchCupons = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { per_page: 20 };
      if (search) params.search = search;
      const res = await cupomService.list(params);
      setCupons(res.data || []);
      setTotalPages(Math.ceil((res.total || 0) / (res.per_page || 20)));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao carregar cupons", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchCupons();
  }, [fetchCupons]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await cupomService.delete(deleteTarget.id);
      toast({ title: "Cupom excluído!" });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchCupons();
    } catch (err) {
      toast({ title: "Erro", description: "Falha ao excluir cupom", variant: "destructive" });
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR");
  };

  const tipoLabel = (t: string) => t === "percentual" ? "%" : "R$";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupons de Desconto</h1>
          <p className="text-sm text-muted-foreground">Gerencie os cupons de desconto do sistema</p>
        </div>
        <Button onClick={() => navigate('/admin/settings/cupom-desconto/create')}>
          <Plus className="w-4 h-4 mr-2" /> Novo Cupom
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cupom..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Cursos</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Limite</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : cupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum cupom encontrado
                  </TableCell>
                </TableRow>
              ) : (
                cupons.map((cupom) => (
                  <TableRow key={cupom.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/settings/cupom-desconto/${cupom.id}`)}>
                    <TableCell>
                      <span className="font-mono font-bold uppercase">{cupom.codigo}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {tipoLabel(cupom.tipo)} {cupom.valor_desconto}
                        {cupom.tipo === "percentual" ? "%" : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {cupom.validade_inicio ? (
                        <span>{formatDate(cupom.validade_inicio)} → {formatDate(cupom.validade_fim)}</span>
                      ) : "Sem prazo"}
                    </TableCell>
                    <TableCell>
                      {cupom.cursos && cupom.cursos.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {cupom.cursos.slice(0, 2).map((c) => (
                            <Badge key={c.id} variant="outline" className="text-xs">{c.titulo}</Badge>
                          ))}
                          {cupom.cursos.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{cupom.cursos.length - 2}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Todos</span>
                      )}
                    </TableCell>
                    <TableCell>{cupom.usos}</TableCell>
                    <TableCell>{cupom.limite_uso ?? "∞"}</TableCell>
                    <TableCell>
                      {cupom.ativo === "s" ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/settings/cupom-desconto/${cupom.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/settings/cupom-desconto/${cupom.id}/edit`)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(cupom); setDeleteDialogOpen(true); }}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
            <AlertDialogDescription>
              O cupom <strong>{deleteTarget?.codigo}</strong> será desativado. É possível restaurá-lo depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
