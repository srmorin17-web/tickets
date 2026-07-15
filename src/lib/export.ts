import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { TicketWithRelations } from './types';
import { formatDate } from './ui';

export interface ReportFilters {
  periodoLabel: string;
  tecnicoLabel: string;
  categoriaLabel: string;
}

export interface ReportSummary {
  total: number;
  activos: number;
  resueltos: number;
  cancelados: number;
  slaCumplidoPct: number;
  tiempoPromedioHoras: number;
}

const ESTADO_LABEL: Record<string, string> = {
  recibido: 'Recibido',
  revision: 'En revisión',
  confirmado: 'Confirmado',
  info: 'Requiere información',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};

function ticketRows(tickets: TicketWithRelations[]): (string | number)[][] {
  return tickets.map((t) => [
    t.codigo,
    t.asunto,
    t.categoria?.nombre ?? '—',
    t.prioridad,
    ESTADO_LABEL[t.estado] ?? t.estado,
    t.tecnico?.nombre ?? 'Sin asignar',
    t.solicitante?.nombre ?? '—',
    formatDate(t.created_at),
    t.closed_at ? formatDate(t.closed_at) : '—',
  ]);
}

const TICKET_HEADERS = ['Código', 'Asunto', 'Categoría', 'Prioridad', 'Estado', 'Técnico', 'Solicitante', 'Creado', 'Cierre'];

export function exportReportePDF(
  tickets: TicketWithRelations[],
  filters: ReportFilters,
  summary: ReportSummary,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const marginX = 40;
  let y = 50;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte de tickets — Fundación CALMA', marginX, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  y += 20;
  doc.text(`Generado: ${formatDate(new Date().toISOString())}`, marginX, y);
  y += 14;
  doc.text(`Período: ${filters.periodoLabel}   •   Técnico: ${filters.tecnicoLabel}   •   Categoría: ${filters.categoriaLabel}`, marginX, y);

  y += 22;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen', marginX, y);
  doc.setFont('helvetica', 'normal');
  y += 16;
  const summaryLine = [
    `Total: ${summary.total}`,
    `Activos: ${summary.activos}`,
    `Resueltos: ${summary.resueltos}`,
    `Cancelados: ${summary.cancelados}`,
    `% SLA cumplido: ${summary.slaCumplidoPct.toFixed(1)}%`,
    `Tiempo prom. resolución: ${summary.tiempoPromedioHoras.toFixed(1)} h`,
  ].join('    |    ');
  doc.text(summaryLine, marginX, y);

  y += 20;
  autoTable(doc, {
    startY: y,
    head: [TICKET_HEADERS],
    body: ticketRows(tickets),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [2, 132, 199] },
    margin: { left: marginX, right: marginX },
  });

  doc.save(`reporte-tickets-${Date.now()}.pdf`);
}

export function exportReporteExcel(
  tickets: TicketWithRelations[],
  filters: ReportFilters,
  summary: ReportSummary,
) {
  const wb = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Reporte de tickets — Fundación CALMA'],
    ['Generado', formatDate(new Date().toISOString())],
    ['Período', filters.periodoLabel],
    ['Técnico', filters.tecnicoLabel],
    ['Categoría', filters.categoriaLabel],
    [],
    ['Total', summary.total],
    ['Activos', summary.activos],
    ['Resueltos', summary.resueltos],
    ['Cancelados', summary.cancelados],
    ['% SLA cumplido', `${summary.slaCumplidoPct.toFixed(1)}%`],
    ['Tiempo promedio de resolución (h)', summary.tiempoPromedioHoras.toFixed(1)],
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumen');

  const detailSheet = XLSX.utils.aoa_to_sheet([TICKET_HEADERS, ...ticketRows(tickets)]);
  detailSheet['!cols'] = TICKET_HEADERS.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, detailSheet, 'Tickets');

  XLSX.writeFile(wb, `reporte-tickets-${Date.now()}.xlsx`);
}
