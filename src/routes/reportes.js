const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Guard: solo admins pueden acceder a reportes
function adminOnly(req, res, next) {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso solo para administradores' });
    }
    next();
}

// ─── GET /api/reportes/ventas ──────────────────────────────────────────────
// Query params: dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD)
router.get('/ventas', authMiddleware, adminOnly, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { dateFrom, dateTo } = req.query;

        const where = { tenantId };

        if (dateFrom || dateTo) {
            where.fecha = {};
            if (dateFrom) {
                const start = new Date(dateFrom);
                start.setHours(0, 0, 0, 0);
                where.fecha.gte = start;
            }
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                where.fecha.lte = end;
            }
        }

        const ventas = await prisma.venta.findMany({
            where,
            include: {
                cliente: { select: { id: true, nombre: true } },
                usuario: { select: { id: true, nombre: true } },
            },
            orderBy: { fecha: 'desc' },
        });

        const total = ventas.reduce((sum, v) => sum + Number(v.total), 0);

        res.json({ data: ventas, meta: { total, count: ventas.length } });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ─── GET /api/reportes/stock-critico ─────────────────────────────────────────
router.get('/stock-critico', authMiddleware, adminOnly, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        const productos = await prisma.$queryRaw`
            SELECT id, nombre, sku, stock_actual, stock_minimo, precio_venta, precio_costo
            FROM productos
            WHERE tenant_id = ${tenantId}::uuid
              AND activo = true
              AND stock_actual <= stock_minimo
            ORDER BY (stock_minimo - stock_actual) DESC
        `;

        res.json({ data: productos, meta: { count: productos.length } });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ─── GET /api/reportes/cuentas-corrientes ────────────────────────────────────
router.get('/cuentas-corrientes', authMiddleware, adminOnly, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        const clientes = await prisma.cliente.findMany({
            where: {
                tenantId,
                saldo_actual: { gt: 0 },
                activo: true,
            },
            select: {
                id: true,
                nombre: true,
                telefono: true,
                saldo_actual: true,
                limite_credito: true,
                updatedAt: true,
            },
            orderBy: { saldo_actual: 'desc' },
        });

        const totalDeuda = clientes.reduce((sum, c) => sum + Number(c.saldo_actual), 0);

        res.json({ data: clientes, meta: { totalDeuda, count: clientes.length } });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
