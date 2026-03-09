import * as XLSX from 'xlsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function applyHeaderStyle(ws, headerRow, numCols) {
    for (let c = 0; c < numCols; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r: headerRow, c });
        if (!ws[cellAddr]) continue;
        ws[cellAddr].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            fill: { fgColor: { rgb: '74ACDF' }, patternType: 'solid' },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
                bottom: { style: 'medium', color: { rgb: '1E3A5F' } },
            },
        };
    }
}

function applyTotalRowStyle(ws, totalRow, numCols) {
    for (let c = 0; c < numCols; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r: totalRow, c });
        if (!ws[cellAddr]) continue;
        ws[cellAddr].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1E3A5F' }, patternType: 'solid' },
        };
    }
}

function downloadWorkbook(wb, filename) {
    XLSX.writeFile(wb, filename);
}

function generateFilename(prefix, dateFrom, dateTo, ext = 'xlsx') {
    const fmt = (d) => d ? new Date(d).toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7);
    if (dateFrom && dateTo && dateFrom === dateTo) return `${prefix}-${fmt(dateFrom)}.${ext}`;
    if (dateFrom && dateTo) return `${prefix}-${fmt(dateFrom)}-a-${fmt(dateTo)}.${ext}`;
    return `${prefix}-${fmt()}.${ext}`;
}

// ─── Ventas Excel ─────────────────────────────────────────────────────────────

export function exportVentasExcel(ventas, { dateFrom, dateTo } = {}) {
    const wb = XLSX.utils.book_new();

    // Metadata rows
    const meta = [
        ['ST / DISTRO — Historial de Ventas'],
        [`Período: ${dateFrom ? formatDate(dateFrom) : 'Inicio'} al ${dateTo ? formatDate(dateTo) : formatDate(new Date())}`],
        [`Generado: ${new Date().toLocaleString('es-AR')}`],
        [],
    ];

    const headers = ['# Venta', 'Fecha y Hora', 'Cliente', 'Vendedor', 'Estado', 'Total (ARS)'];

    const rows = ventas.map((v) => [
        v.id,
        formatDateTime(v.fecha),
        v.cliente?.nombre || '— Mostrador —',
        v.usuario?.nombre || '—',
        v.estado === 'pagado' ? 'Pagado' : 'Pendiente',
        Number(v.total),
    ]);

    const totalGeneral = ventas.reduce((sum, v) => sum + Number(v.total), 0);
    const totalRow = ['', '', '', '', 'TOTAL:', totalGeneral];

    const allRows = [...meta, headers, ...rows, [], totalRow];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    const headerRowIndex = meta.length;
    const totalRowIndex = allRows.length - 1;

    applyHeaderStyle(ws, headerRowIndex, headers.length);
    applyTotalRowStyle(ws, totalRowIndex, headers.length);

    // Column widths
    ws['!cols'] = [
        { wch: 10 }, { wch: 22 }, { wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 18 }
    ];

    // Merge title cell
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    downloadWorkbook(wb, generateFilename('reporte-ventas', dateFrom, dateTo));
}

// ─── Stock Crítico Excel ──────────────────────────────────────────────────────

export function exportStockCriticoExcel(productos) {
    const wb = XLSX.utils.book_new();

    const fecha = new Date().toLocaleString('es-AR');
    const meta = [
        ['ST / DISTRO — Stock Crítico'],
        [`Generado: ${fecha}`],
        [`Total productos bajo mínimo: ${productos.length}`],
        [],
    ];

    const headers = ['SKU', 'Producto', 'Stock Actual', 'Stock Mínimo', 'Déficit', 'Precio Venta (ARS)', 'Precio Costo (ARS)'];

    const rows = productos.map((p) => [
        p.sku,
        p.nombre,
        Number(p.stock_actual),
        Number(p.stock_minimo),
        Number(p.stock_minimo) - Number(p.stock_actual),
        Number(p.precio_venta),
        Number(p.precio_costo),
    ]);

    const allRows = [...meta, headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    applyHeaderStyle(ws, meta.length, headers.length);

    ws['!cols'] = [
        { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 20 }
    ];
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Stock Crítico');
    downloadWorkbook(wb, `stock-critico-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Cuentas Corrientes Excel ─────────────────────────────────────────────────

export function exportCuentasCorrientesExcel(clientes, totalDeuda) {
    const wb = XLSX.utils.book_new();

    const fecha = new Date().toLocaleString('es-AR');
    const meta = [
        ['ST / DISTRO — Cuentas Corrientes'],
        [`Generado: ${fecha}`],
        [`Clientes con deuda: ${clientes.length} | Deuda total: $${Number(totalDeuda).toLocaleString('es-AR')}`],
        [],
    ];

    const headers = ['Cliente', 'Teléfono', 'Deuda Actual (ARS)', 'Límite Crédito (ARS)', 'Últ. Movimiento'];

    const rows = clientes.map((c) => [
        c.nombre,
        c.telefono || '—',
        Number(c.saldo_actual),
        Number(c.limite_credito),
        formatDate(c.updatedAt),
    ]);

    const totalRow = ['TOTAL DEUDA:', '', Number(totalDeuda), '', ''];

    const allRows = [...meta, headers, ...rows, [], totalRow];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    const headerRowIndex = meta.length;
    const totalRowIndex = allRows.length - 1;

    applyHeaderStyle(ws, headerRowIndex, headers.length);
    applyTotalRowStyle(ws, totalRowIndex, headers.length);

    ws['!cols'] = [
        { wch: 30 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 20 }
    ];
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Cuentas Corrientes');
    downloadWorkbook(wb, `cuentas-corrientes-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
