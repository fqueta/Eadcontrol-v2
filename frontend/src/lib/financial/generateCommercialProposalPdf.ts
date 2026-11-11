import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CommercialProposalPdfParams {
  title?: string;
  proposalNumber?: string | number;
  clientName: string;
  clientId?: string | number;
  clientPhone?: string;
  clientEmail?: string;
  validityDate?: string;
  issueDate?: string;
  courseTitle?: string;
  moduleTitle?: string;
  stageName?: string;
  workload?: string;
  status?: string;
  subtotal: string;
  discountAmount?: string;
  discountLabel?: string;
  total: string;
  installments?: Array<{
    numero: number;
    descricao?: string;
    vencimento: string;
    valor: string | number;
    forma_pagamento?: string;
  }>;
  institutionName?: string;
  notes?: string;
}

export function generateCommercialProposalPdf(params: CommercialProposalPdfParams): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // --- Header Banner (Slate 900) ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 3, 3, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(params.title || 'PROPOSTA COMERCIAL', margin + 8, currentY + 11);

  // Subtitle / Institution
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  const subtext = params.proposalNumber
    ? `Proposta nº #${params.proposalNumber} • ${params.institutionName || 'Ead Control'}`
    : params.institutionName || 'Ead Control — Plataforma de Ensino';
  doc.text(subtext, margin + 8, currentY + 18);

  // Status Badge right aligned
  const statusLabel = (params.status || 'Aguardando Aprovação').toUpperCase();
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(pageWidth - margin - 58, currentY + 7, 50, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text('STATUS DA PROPOSTA', pageWidth - margin - 33, currentY + 12, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, pageWidth - margin - 33, currentY + 18, { align: 'center' });

  currentY += 34;

  // --- Client Info & Validity Cards (Two Columns) ---
  const colWidth = (pageWidth - margin * 2 - 6) / 2;
  const cardHeight = 36;

  // Box 1: Client Data
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, currentY, colWidth, cardHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('DADOS DO CLIENTE', margin + 6, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  const clientNameTruncated = doc.splitTextToSize(params.clientName || 'Cliente não informado', colWidth - 12);
  doc.text(clientNameTruncated, margin + 6, currentY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  let clientMetaY = currentY + 22;
  if (params.clientId) {
    doc.text(`ID do Cliente: #${params.clientId}`, margin + 6, clientMetaY);
    clientMetaY += 4.5;
  }
  const contactParts: string[] = [];
  if (params.clientPhone) contactParts.push(params.clientPhone);
  if (params.clientEmail) contactParts.push(params.clientEmail);
  if (contactParts.length > 0) {
    const contactLine = doc.splitTextToSize(contactParts.join('  •  '), colWidth - 12);
    doc.text(contactLine, margin + 6, clientMetaY);
  }

  // Box 2: Validity & Emission
  const col2X = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(col2X, currentY, colWidth, cardHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DETALHES DA VALIDADE', col2X + 6, currentY + 7);

  // Emissão
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('EMISSÃO:', col2X + 6, currentY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(params.issueDate || new Date().toLocaleDateString('pt-BR'), col2X + colWidth - 6, currentY + 17, { align: 'right' });

  // Válido Até
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(col2X + 4, currentY + 22, colWidth - 8, 10, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text('VÁLIDO ATÉ:', col2X + 8, currentY + 28.5);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text(params.validityDate || '15 dias corridos', col2X + colWidth - 8, currentY + 28.5, { align: 'right' });

  currentY += cardHeight + 8;

  // --- Section 1: Itens / Curso e Valores ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('DETALHAMENTO DO CURSO / SERVIÇO', margin, currentY);
  currentY += 3;

  const itemTitle = params.moduleTitle || params.courseTitle || 'Curso Profissionalizante';
  const stage = params.stageName || 'Única';
  const workload = params.workload || 'Padrão';

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      fontSize: 8,
    },
    head: [['Item / Descrição', 'Etapa', 'C. Horária', 'Valor Base']],
    body: [
      [
        `${itemTitle}\n${params.courseTitle && params.moduleTitle ? params.courseTitle : 'Inscrição e conteúdo completo'}`,
        stage,
        workload,
        params.subtotal,
      ],
    ],
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 26, halign: 'center' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // --- Financial Summary Table ---
  const summaryRows: any[] = [
    [{ content: 'Subtotal:', styles: { halign: 'right', fontStyle: 'bold' } }, { content: params.subtotal, styles: { halign: 'right' } }],
  ];

  if (params.discountAmount && params.discountAmount !== 'R$ 0,00' && params.discountAmount !== '0') {
    summaryRows.push([
      { content: `${params.discountLabel || 'Desconto Concedido'}:`, styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } },
      { content: `- ${params.discountAmount}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } },
    ]);
  }

  summaryRows.push([
    {
      content: 'TOTAL LÍQUIDO DA PROPOSTA:',
      styles: {
        halign: 'right',
        fontStyle: 'bold',
        fontSize: 10,
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
      },
    },
    {
      content: params.total,
      styles: {
        halign: 'right',
        fontStyle: 'bold',
        fontSize: 11,
        fillColor: [241, 245, 249],
        textColor: [16, 185, 129], // emerald-600
      },
    },
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: pageWidth - margin - 100, right: margin },
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [71, 85, 105],
    },
    body: summaryRows,
    columnStyles: {
      0: { cellWidth: 62 },
      1: { cellWidth: 38 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --- Section 2: Cronograma de Parcelas / Pagamento (se houver) ---
  if (params.installments && params.installments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('PLANO DE PAGAMENTO / PARCELAS PREVISTAS', margin, currentY);
    currentY += 3;

    const installmentRows = params.installments.map((inst, idx) => {
      const valStr = typeof inst.valor === 'number'
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.valor)
        : String(inst.valor).startsWith('R$') ? String(inst.valor) : `R$ ${inst.valor}`;
      return [
        `Parcela #${inst.numero || idx + 1}`,
        inst.descricao || `Parcela ${inst.numero || idx + 1}`,
        inst.vencimento ? new Date(inst.vencimento).toLocaleDateString('pt-BR') : 'A definir',
        inst.forma_pagamento ? inst.forma_pagamento.toUpperCase() : 'BOLETO / PIX',
        valStr,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'striped',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2.8,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [15, 23, 42], // slate-900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      head: [['Parcela', 'Descrição', 'Vencimento Previsto', 'Forma', 'Valor']],
      body: installmentRows,
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 32, halign: 'center' },
        3: { cellWidth: 32, halign: 'center' },
        4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- Terms / Observações ---
  const availableSpace = pageHeight - currentY - 26;
  if (availableSpace > 20) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, Math.min(22, availableSpace), 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('CONDIÇÕES GERAIS E INSTRUÇÕES', margin + 6, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const notesText = params.notes
      ? params.notes
      : '• Valores sujeitos a alteração após o prazo de validade desta proposta.\n• A confirmação da matrícula e liberação do acesso às aulas ocorrem mediante confirmação do pagamento da 1ª parcela ou taxa de inscrição.';
    const notesLines = doc.splitTextToSize(notesText, pageWidth - margin * 2 - 12);
    doc.text(notesLines, margin + 6, currentY + 11);
  }

  // --- Footer ---
  const footerY = pageHeight - 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento gerado automaticamente pelo Ead Control em ${new Date().toLocaleString('pt-BR')}`,
    margin,
    footerY
  );
  doc.text('Página 1 de 1', pageWidth - margin, footerY, { align: 'right' });

  return doc;
}

export function downloadCommercialProposalPdf(params: CommercialProposalPdfParams, filename?: string) {
  const doc = generateCommercialProposalPdf(params);
  const safeName = (params.clientName || 'proposta')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const outName = filename || `proposta_comercial_${safeName || 'cliente'}.pdf`;
  doc.save(outName);
}

export function printCommercialProposalPdf(params: CommercialProposalPdfParams) {
  const doc = generateCommercialProposalPdf(params);
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = blobUrl;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Erro ao disparar impressão direta do PDF:', e);
      window.open(blobUrl, '_blank');
    }
  };
}

