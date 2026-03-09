const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/cierres/auto (para automatización vía Cron)
router.post('/auto', async (req, res) => {
    try {
        const secret = req.headers['x-cron-secret'];
        if (secret !== process.env.INTERNAL_SECRET) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        // Esta versión automática procesará TODOS los tenants que tengan ventas pendientes
        const tenants = await prisma.tenant.findMany({
            include: {
                ventas: {
                    where: { cierreDiarioId: null }
                }
            }
        });

        let cierresRealizados = 0;

        for (const tenant of tenants) {
            if (tenant.ventas.length === 0) continue;

            const totalVendido = tenant.ventas.reduce((sum, v) => sum + Number(v.total), 0);
            const hoy = new Date();

            await prisma.$transaction(async (tx) => {
                const cierre = await tx.cierreDiario.create({
                    data: {
                        tenantId: tenant.id,
                        fecha: hoy,
                        total_vendido: totalVendido,
                        productos_vendidos: [] // Simplificado para procesos automáticos masivos
                    }
                });

                await tx.venta.updateMany({
                    where: { tenantId: tenant.id, cierreDiarioId: null },
                    data: { cierreDiarioId: cierre.id }
                });
            });
            cierresRealizados++;
        }

        res.json({ message: 'Automatización completada', tenantsProcesados: cierresRealizados });
    } catch (error) {
        res.status(500).json({ error: 'Error en proceso automático' });
    }
});

// POST /api/cierres/cerrar
router.post('/cerrar', authMiddleware, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { monto_declarado } = req.body;

        const ventasPorCerrar = await prisma.venta.findMany({
            where: {
                tenantId: tenantId,
                cierreDiarioId: null,
            },
            include: {
                items: {
                    include: {
                        producto: true
                    }
                }
            }
        });

        if (ventasPorCerrar.length === 0) {
            return res.status(400).json({ error: 'No hay ventas pendientes de cierre' });
        }

        const totalVendido = ventasPorCerrar.reduce((sum, v) => sum + Number(v.total), 0);
        // Filtrar solo las ventas en efectivo para el cuadre (las transferencias no van a la caja física)
        const totalEfectivoEsperado = ventasPorCerrar
            .filter(v => v.metodo_pago === 'efectivo')
            .reduce((sum, v) => sum + Number(v.total), 0);

        const montoDeclaradoNum = Number(monto_declarado) || 0;
        const diferencia = montoDeclaradoNum - totalEfectivoEsperado;

        const productosVendidos = [];

        ventasPorCerrar.forEach(v => {
            v.items.forEach(item => {
                const existing = productosVendidos.find(p => p.id === item.productoId);
                if (existing) {
                    existing.cantidad += item.cantidad;
                    existing.subtotal += Number(item.subtotal);
                } else {
                    productosVendidos.push({
                        id: item.productoId,
                        nombre: item.producto.nombre,
                        cantidad: item.cantidad,
                        subtotal: Number(item.subtotal)
                    });
                }
            });
        });

        const hoy = new Date();

        const result = await prisma.$transaction(async (tx) => {
            const cierre = await tx.cierreDiario.create({
                data: {
                    tenantId: tenantId,
                    fecha: hoy,
                    total_vendido: totalVendido,
                    productos_vendidos: productosVendidos,
                    // TODO: Necesitamos agregar campos en la BD para el cuadre (monto_esperado_efectivo, monto_declarado_efectivo, diferencia)
                    // Por ahora, al menos hacemos el cierre seguro
                }
            });

            await tx.venta.updateMany({
                where: {
                    tenantId: tenantId,
                    cierreDiarioId: null
                },
                data: {
                    cierreDiarioId: cierre.id
                }
            });

            return cierre;
        });

        res.json({
            message: 'Cierre realizado con éxito',
            cierre: result,
            cuadre: {
                esperado: totalEfectivoEsperado, // Se revela solo DESPUÉS de cerrar
                declarado: montoDeclaradoNum,
                diferencia: diferencia
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al cerrar caja' });
    }
});

// GET /api/cierres
router.get('/', authMiddleware, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { dateFrom, dateTo } = req.query;

        const whereClause = { tenantId };

        if (dateFrom && dateTo) {
            whereClause.fecha = {
                gte: new Date(`${dateFrom}T00:00:00.000`),
                lte: new Date(`${dateTo}T23:59:59.999`)
            };
        }

        const cierres = await prisma.cierreDiario.findMany({
            where: whereClause,
            orderBy: { fecha: 'desc' }
        });

        res.json(cierres);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial' });
    }
});

module.exports = router;
