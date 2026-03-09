const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

const createProductoSchema = z.object({
    nombre: z.string().min(1, 'El nombre es requerido'),
    sku: z.string().min(1, 'El SKU es requerido'),
    precio_venta: z.number().min(0, 'El precio no puede ser negativo'),
    precio_costo: z.number().min(0, 'El costo no puede ser negativo'),
    stock_actual: z.number().min(0).optional(),
    stock_minimo: z.number().min(0).optional(),
});

const updateProductoSchema = z.object({
    nombre: z.string().min(1).optional(),
    sku: z.string().min(1).optional(),
    precio_venta: z.number().min(0).optional(),
    precio_costo: z.number().min(0).optional(),
    stock_actual: z.number().min(0).optional(),
    stock_minimo: z.number().min(0).optional(),
    activo: z.boolean().optional(),
});

// Middleware de seguridad para validar que el recurso pertenece al tenant
// Lo haremos de forma explícita en cada endpoint para mayor control

// GET /api/productos - Listar todos los productos
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
                { sku: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [productos, total] = await Promise.all([
            prisma.producto.findMany({
                where,
                orderBy: { nombre: 'asc' },
                skip: Number(skip),
                take: Number(limit),
            }),
            prisma.producto.count({ where })
        ]);



        res.json({
            data: productos,
            meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/productos/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const producto = await prisma.producto.findFirst({
            where: { id: parseInt(req.params.id), tenantId: req.user.tenantId },
        });

        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(producto);
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/productos
router.post('/', authMiddleware, validateBody(createProductoSchema), async (req, res) => {
    try {
        const { nombre, sku, precio_venta, precio_costo, stock_actual, stock_minimo } = req.body;
        const tenantId = req.user.tenantId;

        const existingSku = await prisma.producto.findFirst({ where: { tenantId, sku } });
        if (existingSku) {
            return res.status(400).json({ error: 'Ya existe un producto con ese SKU' });
        }

        const producto = await prisma.producto.create({
            data: {
                tenantId,
                nombre,
                sku,
                precio_venta,
                precio_costo,
                stock_actual: stock_actual || 0,
                stock_minimo: stock_minimo || 5,
            },
        });

        res.status(201).json(producto);
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// PUT /api/productos/:id
router.put('/:id', authMiddleware, adminOnly, validateBody(updateProductoSchema), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

        const tenantId = req.user.tenantId;
        const { nombre, sku, precio_venta, precio_costo, stock_actual, stock_minimo, activo } = req.body;

        const existing = await prisma.producto.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: 'Producto no encontrado o sin acceso' });
        }

        if (sku && sku !== existing.sku) {
            const existingSku = await prisma.producto.findFirst({ where: { tenantId, sku } });
            if (existingSku) {
                return res.status(400).json({ error: 'Ya existe un producto con ese SKU' });
            }
        }

        const producto = await prisma.producto.update({
            where: { id },
            data: {
                ...(nombre !== undefined && { nombre }),
                ...(sku !== undefined && { sku }),
                ...(precio_venta !== undefined && { precio_venta }),
                ...(precio_costo !== undefined && { precio_costo }),
                ...(stock_actual !== undefined && { stock_actual }),
                ...(stock_minimo !== undefined && { stock_minimo }),
                ...(activo !== undefined && { activo }),
            },
        });

        res.json(producto);
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// DELETE /api/productos/:id (soft delete)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const tenantId = req.user.tenantId;

        const existing = await prisma.producto.findFirst({ where: { id, tenantId } });
        if (!existing) {
            return res.status(404).json({ error: 'Producto no encontrado o sin acceso' });
        }

        await prisma.producto.update({
            where: { id },
            data: { activo: false },
        });

        res.json({ message: 'Producto desactivado' });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
