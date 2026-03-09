import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const BRAND = 'ST / DISTRO';
const PRIMARY = [116, 172, 223]; // #74ACDF
const PRIMARY_DARK = [30, 58, 95];
const ALTERNATE_ROW = [240, 246, 252];

function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(value));
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function buildHeader(doc, title, subtitle = '') {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Background bar
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Brand name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(BRAND, 14, 12);

    // ERP label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('GESTIÓN DE DISTRIBUIDORAS', 14, 18);

    // Report title (right-aligned)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth - 14, 12, { align: 'right' });

    // Generation timestamp
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const now = new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
    doc.text(`Generado: ${now}`, pageWidth - 14, 18, { align: 'right' });

    // Subtitle / filter info
    if (subtitle) {
        doc.setTextColor(...PRIMARY_DARK);
        doc.setFontSize(8);
        doc.text(subtitle, 14, 34);
    }

    return subtitle ? 38 : 32;
}

function buildFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(...PRIMARY);
        doc.setLineWidth(0.4);
        doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`${BRAND} — Reporte confidencial`, 14, pageHeight - 7);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
    }
}

function generateFilename(prefix, dateFrom, dateTo) {
    const fmt = (d) => d ? new Date(d).toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7);
    if (dateFrom && dateTo && dateFrom === dateTo) return `${prefix}-${fmt(dateFrom)}.pdf`;
    if (dateFrom && dateTo) return `${prefix}-${fmt(dateFrom)}-a-${fmt(dateTo)}.pdf`;
    return `${prefix}-${fmt()}.pdf`;
}

// ─── Ventas PDF ───────────────────────────────────────────────────────────────

export function exportVentasPDF(ventas, { dateFrom, dateTo } = {}) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const subtitle = dateFrom && dateTo
        ? `Período: ${formatDate(dateFrom)} al ${formatDate(dateTo)}`
        : dateFrom ? `Desde: ${formatDate(dateFrom)}` : 'Todas las ventas';

    const startY = buildHeader(doc, 'HISTORIAL DE VENTAS', subtitle);

    const rows = ventas.map((v) => [
        `#${v.id}`,
        formatDateTime(v.fecha),
        v.cliente?.nombre || '— Mostrador —',
        v.usuario?.nombre || '—',
        v.estado === 'pagado' ? 'Pagado ✓' : 'Pendiente ⏳',
        formatCurrency(v.total),
    ]);

    const totalGeneral = ventas.reduce((sum, v) => sum + Number(v.total), 0);

    autoTable(doc, {
        startY,
        head: [['#', 'Fecha y Hora', 'Cliente', 'Vendedor', 'Estado', 'Total']],
        body: rows,
        foot: [['', '', '', '', 'TOTAL PERÍODO:', formatCurrency(totalGeneral)]],
        headStyles: {
            fillColor: PRIMARY,
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
        },
        footStyles: {
            fillColor: PRIMARY_DARK,
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
        },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: ALTERNATE_ROW },
        columnStyles: {
            0: { cellWidth: 14 },
            1: { cellWidth: 40 },
            4: { cellWidth: 24, halign: 'center' },
            5: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 },
        tableLineColor: [220, 220, 220],
        tableLineWidth: 0.1,
    });

    buildFooter(doc);
    doc.save(generateFilename('reporte-ventas', dateFrom, dateTo));
}

// ─── Stock Crítico PDF ────────────────────────────────────────────────────────

export function exportStockCriticoPDF(productos) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = buildHeader(doc, 'STOCK CRÍTICO', `Total: ${productos.length} productos bajo mínimo`);

    const rows = productos.map((p) => {
        const deficit = Number(p.stock_minimo) - Number(p.stock_actual);
        return [
            p.sku,
            p.nombre,
            p.stock_actual,
            p.stock_minimo,
            deficit > 0 ? `−${deficit}` : '0',
            formatCurrency(p.precio_venta),
        ];
    });

    autoTable(doc, {
        startY,
        head: [['SKU', 'Producto', 'Stock Actual', 'Stock Mínimo', 'Déficit', 'Precio Venta']],
        body: rows,
        headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: ALTERNATE_ROW },
        didParseCell(data) {
            // Red for deficit column
            if (data.section === 'body' && data.column.index === 4) {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = 'bold';
            }
        },
        columnStyles: {
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'right' },
        },
        margin: { left: 14, right: 14 },
    });

    buildFooter(doc);
    const fecha = new Date().toISOString().slice(0, 10);
    doc.save(`stock-critico-${fecha}.pdf`);
}

// ─── Cuentas Corrientes PDF ───────────────────────────────────────────────────

export function exportCuentasCorrientesPDF(clientes, totalDeuda) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = buildHeader(
        doc,
        'CUENTAS CORRIENTES',
        `${clientes.length} clientes con deuda | Total: ${formatCurrency(totalDeuda)}`
    );

    const rows = clientes.map((c) => [
        c.nombre,
        c.telefono || '—',
        formatCurrency(c.saldo_actual),
        formatCurrency(c.limite_credito),
        formatDate(c.updatedAt),
    ]);

    autoTable(doc, {
        startY,
        head: [['Cliente', 'Teléfono', 'Deuda Actual', 'Límite Crédito', 'Últ. movimiento']],
        body: rows,
        foot: [['', 'TOTAL DEUDA:', formatCurrency(totalDeuda), '', '']],
        headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        footStyles: { fillColor: PRIMARY_DARK, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: ALTERNATE_ROW },
        columnStyles: {
            2: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
            3: { halign: 'right' },
            4: { halign: 'center' },
        },
        margin: { left: 14, right: 14 },
    });

    buildFooter(doc);
    const fecha = new Date().toISOString().slice(0, 10);
    doc.save(`cuentas-corrientes-${fecha}.pdf`);
}
