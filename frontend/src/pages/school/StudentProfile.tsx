import InclusiveSiteLayout from '@/components/layout/InclusiveSiteLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { UserCircle, Settings, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

/**
 * StudentProfile
 * pt-BR: Página de perfil do aluno alinhada ao layout atual (cards, grid, tipografia)
 *        com cabeçalho, quadro de informações e ações rápidas.
 * en-US: Student profile page aligned with the current layout (cards, grid, typography)
 *        including header, info board and quick actions.
 */
export default function StudentProfile() {
  const { user } = useAuth();
  const email = useMemo(() => (user as any)?.email || (user as any)?.mail || '', [user]);
  const clientId = useMemo(() => (user as any)?.id_cliente || (user as any)?.client_id || (user as any)?.cliente_id || '', [user]);

  /**
   * getInitials
   * pt-BR: Gera iniciais do usuário para avatar fallback.
   * en-US: Generates user initials for avatar fallback.
   */
  function getInitials(name?: string): string {
    const s = String(name || '').trim();
    if (!s) return 'AL';
    const parts = s.split(/\s+/);
    const first = parts[0]?.[0] ?? 'A';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? 'L' : (parts[0]?.[1] ?? 'L');
    return `${first}${last}`.toUpperCase();
  }

  return (
    <InclusiveSiteLayout>
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
            <p className="text-muted-foreground">Gerencie suas informações e preferências</p>
          </div>
        </div>

        {/* Profile summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border">
                <AvatarFallback>{getInitials(String(user?.name || 'Aluno'))}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <div className="text-lg font-semibold leading-tight">{String(user?.name || '—')}</div>
                <div className="text-sm text-muted-foreground">{String(email || '—')}</div>
              </div>
            </div>
            <Separator className="my-6" />

            {/* Details grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={String(user?.name || '')} readOnly />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={String(email || '')} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Cliente ID</Label>
                <Input value={String(clientId || '')} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Permissão</Label>
                <Input value={String((user as any)?.permission_id ?? '—')} readOnly />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-0 hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                <CardTitle className="text-base">Perfil</CardTitle>
              </div>
              <CardDescription>Atualizar seus dados</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" onClick={() => (window.location.href = '/loja/area-cliente?tab=settings')}>Abrir</Button>
            </CardContent>
          </Card>

          <Card className="p-0 hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <CardTitle className="text-base">Preferências</CardTitle>
              </div>
              <CardDescription>Configurações de conta</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" onClick={() => (window.location.href = '/loja/area-cliente?tab=settings')}>Abrir</Button>
            </CardContent>
          </Card>

          <Card className="p-0 hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                <CardTitle className="text-base">Segurança</CardTitle>
              </div>
              <CardDescription>Senha e acesso</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" onClick={() => (window.location.href = '/reset-password')}>Abrir</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </InclusiveSiteLayout>
  );
}