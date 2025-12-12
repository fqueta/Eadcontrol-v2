import React from 'react';
import CustomersLeads from './CustomersLeads';

/**
 * Sales
 * pt-BR: Área de Vendas — exibe funis semelhantes aos de Atendimento,
 *        reutilizando o componente de Leads para prover kanban, estágios,
 *        criação rápida de leads e movimentação entre etapas.
 * en-US: Sales Area — displays funnels similar to the Support area,
 *        reusing the Leads component to provide kanban, stages,
 *        quick lead creation, and stage movement.
 */
/**
 * Sales
 * pt-BR: Área de Vendas — filtra e exibe funis exclusivamente da área de vendas,
 *        reutilizando o componente de Leads com o filtro apropriado.
 * en-US: Sales Area — filters and displays funnels exclusively from the sales area,
 *        reusing the Leads component with the proper filter.
 */
export default function Sales() {
  return (
    <CustomersLeads place="vendas" />
  );
}