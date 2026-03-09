const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard
router.get('/', authMiddleware, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Ventas del día (propias del tenant)
        const ventasHoy = await prisma.venta.findMany({
            where: {
                tenantId,
                fecha: { gte: today, lt: tomorrow },
                estado: 'pagado', // Solo ingresos confirmados
            },
            select: { total: true, metodo_pago: true }
        });

        const ingresosEfectivo = ventasHoy
            .filter(v => v.metodo_pago === 'efectivo')
            .reduce((sum, v) => sum + parseFloat(v.total), 0);

        const ingresosTransferencia = ventasHoy
            .filter(v => v.metodo_pago === 'transferencia' || v.metodo_pago === 'otro')
            .reduce((sum, v) => sum + parseFloat(v.total), 0);

        const ventaTotalDia = ingresosEfectivo + ingresosTransferencia;
        const cantidadPedidosDia = ventasHoy.length;

        // Gastos del día
        const gastosHoyData = await prisma.gasto.findMany({
            where: {
                tenantId,
                fecha: { gte: today, lt: tomorrow }
            },
            select: { monto: true }
        });
        const gastosHoy = gastosHoyData.reduce((sum, g) => sum + parseFloat(g.monto), 0);

        // Productos con stock bajo (limitar a top 3 más urgentes)
        const todosLosProductos = await prisma.producto.findMany({
            where: { tenantId, activo: true },
            select: {
                id: true,
                nombre: true,
                stock_actual: true,
                stock_minimo: true,
            },
        });

        const productosStockBajo = todosLosProductos
            .filter((p) => p.stock_actual <= p.stock_minimo)
            .sort((a, b) => (a.stock_actual - a.stock_minimo) - (b.stock_actual - b.stock_minimo))
            .slice(0, 3); // Top 3 más críticos

        // Saldo pendiente total
        const clientesConSaldo = await prisma.cliente.aggregate({
            _sum: { saldo_actual: true },
            where: { tenantId, activo: true },
        });
        const saldoPendienteTotal = parseFloat(clientesConSaldo._sum.saldo_actual || 0);

        // Últimas 5 ventas
        const ultimasVentas = await prisma.venta.findMany({
            where: { tenantId },
            take: 5,
            orderBy: { fecha: 'desc' },
            include: {
                cliente: { select: { nombre: true } },
                usuario: { select: { nombre: true } },
            },
        });

        // Rendimiento Semanal (semana actual de Lunes a Domingo)
        const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
        const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const monday = new Date(today);
        monday.setDate(today.getDate() + offsetToMonday);
        monday.setHours(0, 0, 0, 0);

        const nextMonday = new Date(monday);
        nextMonday.setDate(monday.getDate() + 7);

        const ventasSemana = await prisma.venta.findMany({
            where: {
                tenantId,
                fecha: { gte: monday, lt: nextMonday },
                // Incluimos todas las ventas (pagadas y pendientes) para el gráfico
            },
            select: { total: true, fecha: true }
        });

        // Agrupar ventas por día
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const rendimientoSemanalMap = {};

        // Generar siempre 7 días, empezando desde el Lunes
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(d.getDate() + i);
            // Usar fecha LOCAL para que coincida con el timezone del servidor
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            rendimientoSemanalMap[dateStr] = {
                name: days[d.getDay()],
                total: 0,
                fullDate: dateStr
            };
        }

        ventasSemana.forEach(v => {
            const vDate = new Date(v.fecha);
            // Usar fecha LOCAL del servidor para que el día coincida correctamente
            const year = vDate.getFullYear();
            const month = String(vDate.getMonth() + 1).padStart(2, '0');
            const day = String(vDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            if (rendimientoSemanalMap[dateStr]) {
                rendimientoSemanalMap[dateStr].total += parseFloat(v.total);
            }
        });

        const rendimientoSemanal = Object.values(rendimientoSemanalMap);

        res.json({
            ventaTotalDia,
            ingresosEfectivo,
            ingresosTransferencia,
            gastosHoy,
            cantidadPedidosDia,
            productosStockBajo,
            saldoPendienteTotal,
            ultimasVentas,
            rendimientoSemanal
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
