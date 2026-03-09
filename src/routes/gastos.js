const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

const createGastoSchema = z.object({
    descripcion: z.string().min(1, 'La descripción es requerida'),
    monto: z.number().min(0.01, 'El monto debe ser mayor a 0'),
    fecha: z.string().optional(), // opcional, por defecto now()
});

// GET /api/gastos (listar gastos del tenant)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta, page = 1, limit = 50 } = req.query;
        const tenantId = req.user.tenantId;
        const skip = (page - 1) * limit;

        const where = { tenantId };

        if (fecha_desde || fecha_hasta) {
            where.fecha = {};
            if (fecha_desde) {
                const start = new Date(fecha_desde);
                start.setHours(0, 0, 0, 0);
                where.fecha.gte = start;
            }
            if (fecha_hasta) {
                const end = new Date(fecha_hasta);
                end.setHours(23, 59, 59, 999);
                where.fecha.lte = end;
            }
        }

        const [gastos, total] = await Promise.all([
            prisma.gasto.findMany({
                where,
                orderBy: { fecha: 'desc' },
                skip: Number(skip),
                take: Number(limit),
            }),
            prisma.gasto.count({ where })
        ]);

        res.json({
            data: gastos,
            meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor al obtener gastos' });
    }
});

// POST /api/gastos (crear un gasto)
router.post('/', authMiddleware, adminOnly, validateBody(createGastoSchema), async (req, res) => {
    try {
        const { descripcion, monto, fecha } = req.body;
        const tenantId = req.user.tenantId;

        const dataToCreate = {
            tenantId,
            descripcion,
            monto,
        };

        if (fecha) {
            dataToCreate.fecha = new Date(fecha);
        }

        const gasto = await prisma.gasto.create({
            data: dataToCreate
        });

        res.status(201).json(gasto);
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor al crear gasto' });
    }
});

// DELETE /api/gastos/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const tenantId = req.user.tenantId;

        const existing = await prisma.gasto.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: 'Gasto no encontrado o sin acceso' });
        }

        await prisma.gasto.delete({
            where: { id }
        });

        res.json({ message: 'Gasto eliminado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor al eliminar gasto' });
    }
});

module.exports = router;
