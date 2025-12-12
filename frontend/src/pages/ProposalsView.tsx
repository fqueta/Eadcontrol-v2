import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao funil
        </Button>
        <Button variant="outline" size="sm" onClick={handleEdit}>
          <Pencil className="h-4 w-4 mr-2" /> Editar Proposta
        </Button>
      </div>
      {id ? <ProposalViewContent id={String(id)} /> : null}
    </div>
  );
}