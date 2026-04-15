type CertificateSource = 'custom' | 'generic';

import { certificatesService } from '@/services/certificatesService';

export interface GenerateCertificatePdfParams {
  enrollmentId: string | number;
  studentId?: string | number;
  studentName: string;
  courseTitle: string;
  workloadLabel: string;
  customPdfGenerator?: (enrollmentId: string | number) => Promise<Blob>;
}

const sanitizeFileName = (value: string) =>
  String(value || 'aluno')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

const downloadBlob = (blob: Blob, fileName: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
};

const tryEmbedValidationQr = async (enrollmentId: string | number, studentId: string | number | undefined, doc: any) => {
  const baseUrl = `${window.location.origin}/certificado/validar/${encodeURIComponent(String(enrollmentId))}`;
  const qrData = studentId ? `${baseUrl}?alunoId=${encodeURIComponent(String(studentId))}` : baseUrl;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&format=png&margin=1&_=${Date.now()}`;

  try {
    const resp = await fetch(qrUrl, { mode: 'cors', cache: 'no-store' });
    if (!resp.ok) throw new Error(`QR fetch status ${resp.status}`);
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const qrBase64 = `data:image/png;base64,${btoa(binary)}`;
    doc.addImage(qrBase64, 'PNG', 243, 153, 30, 30);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Escaneie para validar', 258, 185, { align: 'center' });
  } catch (error) {
    console.warn('QR Code could not be embedded in the PDF:', error);
  }
};

export async function generateCertificatePdf({
  enrollmentId,
  studentId,
  studentName,
  courseTitle,
  workloadLabel,
  customPdfGenerator,
}: GenerateCertificatePdfParams): Promise<CertificateSource> {
  const safeName = sanitizeFileName(studentName);

  // Default to backend PDF generator if not explicitly provided
  const generator = customPdfGenerator || ((id) => certificatesService.generatePdf(id));

  // 1) Try custom backend template first (if available)
  if (generator) {
    try {
      console.log(`[generateCertificatePdf] Calling generator for enrollmentId: ${enrollmentId}`);
      const blob = await generator(enrollmentId);
      downloadBlob(blob, `certificado_${String(enrollmentId)}.pdf`);
      return 'custom';
    } catch (err: any) {
      console.error('[generateCertificatePdf] Backend generator failed:', err);
      window.alert(`Erro ao gerar certificado personalizado: ${err.message || err}. Usando modelo padrão.`);
      // fallback to generic certificate
    }
  }

  // 2) Generic certificate
  const jsPDF = (await import('jspdf')).default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString('pt-BR');

  doc.setDrawColor(200, 160, 50);
  doc.setLineWidth(3);
  doc.rect(8, 8, 281, 193);
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.5);
  doc.rect(13, 13, 271, 183);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(40, 40, 40);
  doc.text('CERTIFICADO DE CONCLUSÃO', 148.5, 48, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(110, 110, 110);
  doc.text('Certificamos que', 148.5, 70, { align: 'center' });

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(26);
  doc.setTextColor(30, 30, 30);
  doc.text(studentName || 'Aluno', 148.5, 90, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.text('concluiu com êxito o curso de', 148.5, 110, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(185, 145, 30);
  doc.text(courseTitle || 'Curso', 148.5, 126, { align: 'center', maxWidth: 220 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(110, 110, 110);
  doc.text(`realizado em ${dateStr}, com carga horária de ${workloadLabel || '---'}.`, 148.5, 148, { align: 'center' });

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.line(85, 172, 215, 172);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Diretoria Acadêmica', 148.5, 179, { align: 'center' });

  await tryEmbedValidationQr(enrollmentId, studentId, doc);
  doc.save(`certificado_${safeName}.pdf`);
  return 'generic';
}
