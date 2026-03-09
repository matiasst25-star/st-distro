const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

const createClienteSchema = z.object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    telefono: z.string().optional().nullable(),
    direccion: z.string().optional().nullable(),
    limite_credito: z.number().min(0, 'El límite de crédito no puede ser negativo').optional(),
});

const updateClienteSchema = z.object({
    nombre: z.string().min(1).optional(),
    telefono: z.string().optional().nullable(),
    direccion: z.string().optional().nullable(),
    limite_credito: z.number().min(0).optional(),
    activo: z.boolean().optional(),
});

// GET /api/clientes
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { activo, search, page = 1, limit = 50 } = req.query;
        const tenantId = req.user.tenantId;
        const skip = (page - 1) * limit;

        const where = { tenantId };

        if (activo !== undefined) {
            where.activo = activo === 'true';
        }

        if (search) {
            where.OR = [
                { nombre: { contains: search, mode: 'insensitive' } },
                { telefono: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [clientes, total] = await Promise.all([
            prisma.cliente.findMany({
                where,
                orderBy: { nombre: 'asc' },
                skip: Number(skip),
                take: Number(limit),
            }),
            prisma.cliente.count({ where })
        ]);

        res.json({
            data: clientes,
            meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/clientes/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const cliente = await prisma.cliente.findFirst({
            where: { id: parseInt(req.params.id), tenantId },
            include: {
                ventas: {
                    orderBy: { fecha: 'desc' },
                    take: 20,
                    include: {
                        items: {
                            include: {
                                producto: { select: { nombre: true, sku: true } },
                            },
                        },
                        usuario: { select: { nombre: true } },
                    },
                },
            },
        });

        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado o sin acceso' });
        }

        res.json(cliente);
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/clientes
router.post('/', authMiddleware, validateBody(createClienteSchema), async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { nombre, telefono, direccion, limite_credito } = req.body;

        const cliente = await prisma.cliente.create({
            data: {
                tenantId,
                nombre,
                telefono: telefono || null,
                direccion: direccion || null,
                limite_credito: limite_credito || 0,
            },
        });

        res.status(201).json(cliente);
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /api/clientes/:id
router.put('/:id', authMiddleware, validateBody(updateClienteSchema), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

        const tenantId = req.user.tenantId;
        const { nombre, telefono, direccion, limite_credito, activo } = req.body;

        const existing = await prisma.cliente.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: 'Cliente no encontrado o sin acceso' });
        }

        const cliente = await prisma.cliente.update({
            where: { id },
            data: {
                ...(nombre !== undefined && { nombre }),
                ...(telefono !== undefined && { telefono }),
                ...(direccion !== undefined && { direccion }),
                ...(limite_credito !== undefined && { limite_credito }),
                ...(activo !== undefined && { activo }),
            },
        });

        res.json(cliente);
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
