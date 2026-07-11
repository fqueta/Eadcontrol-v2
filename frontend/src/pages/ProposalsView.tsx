import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

/**
 * ProposalsView
 * pt-BR: Redireciona automaticamente para a página de visualização da matrícula.
 * en-US: Automatically redirects to the enrollment view page.
 */
export default function ProposalsView() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location?.state || {}) as { returnTo?: string; funnelId?: string };
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    const q = navState?.funnelId ? `?funnel=${encodeURIComponent(String(navState.funnelId))}` : '';
    navigate(`/admin/school/enrollments/view/${encodeURIComponent(String(id))}${q}`, { replace: true });
  }, [id, navState, navigate]);

  return null;
}