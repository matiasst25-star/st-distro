const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

const createVentaSchema = z.object({
    clienteId: z.number().optional().nullable(),
    estado: z.enum(['pagado', 'pendiente']).optional(),
    metodo_pago: z.enum(['efectivo', 'transferencia', 'otro']).optional(),
    items: z.array(z.object({
        productoId: z.number(),
        cantidad: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
    })).min(1, 'La venta debe tener al menos un item'),
});

// GET /api/ventas
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { fecha, estado, clienteId, page = 1, limit = 50 } = req.query;
        const tenantId = req.user.tenantId;
        const skip = (page - 1) * limit;

        const where = { tenantId };

        if (estado) {
            where.estado = estado;
        }

        if (clienteId) {
            where.clienteId = parseInt(clienteId);
        }

        if (fecha) {
            const start = new Date(fecha);
            start.setHours(0, 0, 0, 0);
            const end = new Date(fecha);
            end.setHours(23, 59, 59, 999);
            where.fecha = { gte: start, lte: end };
        }

        const [ventas, total] = await Promise.all([
            prisma.venta.findMany({
                where,
                include: {
                    cliente: { select: { id: true, nombre: true } },
                    usuario: { select: { id: true, nombre: true } },
                    items: {
                        include: {
                            producto: { select: { nombre: true, sku: true } },
                        },
                    },
                },
                orderBy: { fecha: 'desc' },
                skip: Number(skip),
                take: Number(limit),
            }),
            prisma.venta.count({ where })
        ]);

        res.json({
            data: ventas,
            meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/ventas - Crear venta (transacción atómica para este Tenant)
router.post('/', authMiddleware, validateBody(createVentaSchema), async (req, res) => {
    try {
        const { clienteId, items, estado = 'pagado', metodo_pago = 'efectivo' } = req.body;
        const tenantId = req.user.tenantId;



        // Validar que el cliente pertenezca al tenant si enviaron un clienteId
        if (clienteId) {
            const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, tenantId } });
            if (!cliente) return res.status(403).json({ error: 'Cliente inválido' });
        }

        // Ejecutar todo en una transacción atómica y segura por Tenant
        const result = await prisma.$transaction(async (tx) => {
            let totalVenta = 0;
            const itemsData = [];

            for (const item of items) {
                // FindFirst con tenantId garantiza aislamiento total
                const producto = await tx.producto.findFirst({
                    where: { id: item.productoId, tenantId },
                });

                if (!producto) {
                    throw new Error(`Producto con ID ${item.productoId} no encontrado o sin acceso`);
                }

                if (!producto.activo) {
                    throw new Error(`Producto "${producto.nombre}" no está activo`);
                }

                if (producto.stock_actual < item.cantidad) {
                    throw new Error(
                        `Stock insuficiente para "${producto.nombre}". Disponible: ${producto.stock_actual}, Solicitado: ${item.cantidad}`
                    );
                }

                if (item.cantidad <= 0) {
                    throw new Error(`La cantidad para "${producto.nombre}" debe ser mayor a 0`);
                }

                const subtotal = parseFloat(producto.precio_venta) * item.cantidad;
                totalVenta += subtotal;

                itemsData.push({
                    tenantId,
                    productoId: item.productoId,
                    nombre_producto: producto.nombre, // snapshot: preserva nombre si el producto se elimina
                    cantidad: item.cantidad,
                    precio_unitario: producto.precio_venta,
                    subtotal,
                });

                // Descontar stock
                await tx.producto.update({
                    where: { id: item.productoId },
                    data: { stock_actual: { decrement: item.cantidad } },
                });
            }

            // Si es venta pendiente y hay cliente, sumar al saldo
            if (estado === 'pendiente' && clienteId) {
                await tx.cliente.update({
                    where: { id: clienteId }, // clienteId ya validado arriba
                    data: { saldo_actual: { increment: totalVenta } },
                });
            }

            // Crear la venta asignándola explícitamente al Tenant
            const venta = await tx.venta.create({
                data: {
                    tenantId,
                    clienteId: clienteId || null,
                    usuarioId: req.user.id,
                    total: totalVenta,
                    estado,
                    metodo_pago,
                    items: {
                        create: itemsData,
                    },
                },
                include: {
                    items: {
                        include: {
                            producto: { select: { nombre: true, sku: true } },
                        },
                    },
                    cliente: { select: { id: true, nombre: true } },
                    usuario: { select: { id: true, nombre: true } },
                },
            });

            return venta;
        });

        res.status(201).json(result);
    } catch (err) {
        if (err.message.includes('Stock insuficiente') || err.message.includes('no encontrado') || err.message.includes('no está activo')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
