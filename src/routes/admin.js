const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Middleware: only allow if user's email is in the admins table
const adminMiddleware = async (req, res, next) => {
    try {
        const admin = await prisma.admin.findUnique({ where: { email: req.user.email } });
        if (!admin) {
            return res.status(403).json({ error: 'Acceso de administrador requerido' });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: 'Error verificando permisos de administrador' });
    }
};

// Auto-expire tenants whose fecha_vencimiento has passed
async function autoExpireTenants() {
    await prisma.tenant.updateMany({
        where: {
            estado: 'activo',
            fecha_vencimiento: { lt: new Date() },
        },
        data: { estado: 'vencido' },
    });
}

// GET /api/admin/tenants - List all tenants
router.get('/tenants', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        await autoExpireTenants();
        const tenants = await prisma.tenant.findMany({
            select: {
                id: true,
                nombre: true,
                estado: true,
                plan_tipo: true,
                fecha_vencimiento: true,
                createdAt: true,
                _count: { select: { usuarios: true, ventas: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(tenants);
    } catch (err) {
        res.status(500).json({ error: 'Error al listar empresas' });
    }
});

// PUT /api/admin/tenants/:id/approve - Approve a tenant
router.put('/tenants/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_tipo } = req.body;

        if (!plan_tipo || !['crecimiento', 'corporativo'].includes(plan_tipo)) {
            return res.status(400).json({ error: 'plan_tipo debe ser "crecimiento" o "corporativo"' });
        }

        // Fetch current tenant to check existing fecha_vencimiento
        const existingTenant = await prisma.tenant.findUnique({ where: { id } });
        if (!existingTenant) return res.status(404).json({ error: 'Empresa no encontrada' });

        let newFechaVencimiento = new Date();

        // If they already have an expiration date in the future, add 30 days to that.
        // Otherwise, add 30 days from today.
        if (existingTenant.fecha_vencimiento && new Date(existingTenant.fecha_vencimiento) > new Date()) {
            newFechaVencimiento = new Date(existingTenant.fecha_vencimiento);
        }

        newFechaVencimiento.setDate(newFechaVencimiento.getDate() + 30);

        const tenant = await prisma.tenant.update({
            where: { id },
            data: {
                estado: 'activo',
                plan_tipo,
                fecha_vencimiento: newFechaVencimiento,
            },
        });
        res.json(tenant);
    } catch (err) {
        res.status(500).json({ error: 'Error al aprobar/renovar empresa' });
    }
});

// PUT /api/admin/tenants/:id/block - Block a tenant
router.put('/tenants/:id/block', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tenant = await prisma.tenant.update({
            where: { id },
            data: { estado: 'vencido' },
        });
        res.json(tenant);
    } catch (err) {
        res.status(500).json({ error: 'Error al bloquear empresa' });
    }
});

// DELETE /api/admin/tenants/:id - Delete a tenant completely
router.delete('/tenants/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.tenant.delete({
            where: { id },
        });
        res.json({ message: 'Empresa eliminada correctamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar empresa' });
    }
});

module.exports = router;
