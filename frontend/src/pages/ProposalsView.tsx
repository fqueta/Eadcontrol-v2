import React, { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEnrollment } from '@/hooks/enrollments';
import { ArrowLeft, Pencil, Settings } from 'lucide-react';
import ProposalViewContent from '@/components/school/ProposalViewContent';

/**
 * ProposalsView
 * pt-BR: Página de visualização somente leitura de uma proposta.
 * en-US: Read-only page to view a proposal.
 */
export default function ProposalsView() {
  const navigate = useNavigate();
  const location = useLocation();
  // navState
  const navState = (location?.state || {}) as { returnTo?: string; funnelId?: string; stageId?: string };
  const { id } = useParams<{ id: string }>();
  const { data: enrollment } = useEnrollment(String(id || ''));

  const isInterested = useMemo(() => {
    const s = String(enrollment?.situacao ?? enrollment?.status ?? (enrollment as any)?.config?.situacao ?? '').toLowerCase();
    return s.startsWith('int');
  }, [enrollment]);

  /**
   * handleBack
   * pt-BR: Retorna à página de origem, se disponível; senão, vai para vendas.
   * en-US: Returns to origin page if available; otherwise, goes to sales.
   */
  function handleBack() {
    if (navState?.returnTo && typeof navState.returnTo === 'string') {
      navigate(navState.returnTo);
      return;
    }
    if (navState?.funnelId) {
      navigate(`/admin/sales?funnel=${navState.funnelId}`);
      return;
    }
    navigate('/admin/sales');
  }
  /**
   * handleEdit
   * pt-BR: Navega para edição preservando o estado de origem.
   * en-US: Navigates to edit preserving origin state.
   */
  function handleEdit() {
    const stateToPass = navState && typeof navState === 'object' ? navState : {};
    navigate(`/admin/sales/proposals/edit/${id}` , { state: stateToPass });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack}
          className="w-fit text-muted-foreground hover:text-foreground transition-colors -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao funil
        </Button>
        <Button 
          variant="outline" 
          onClick={handleEdit}
          className="shadow-sm border-muted-foreground/20 hover:bg-muted font-semibold transition-all"
        >
          {isInterested ? (
            <>
              <Pencil className="h-4 w-4 mr-2" /> Editar Proposta
            </>
          ) : (
            <>
              <Settings className="h-4 w-4 mr-2" /> Gerenciar Matrícula
            </>
          )}
        </Button>
      </div>
      {id ? <ProposalViewContent id={String(id)} /> : null}
    </div>
  );
}