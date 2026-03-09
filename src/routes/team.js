const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/team/members - List all team members for this tenant
router.get('/members', authMiddleware, adminOnly, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const members = await prisma.usuario.findMany({
            where: { tenantId },
            select: {
                id: true,
                nombre: true,
                email: true,
                rol: true,
                createdAt: true,
                // null password_hash means "invited but not activated"
                password_hash: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        // Map: indicate activation status
        const result = members.map(({ password_hash, ...m }) => ({
            ...m,
            activado: password_hash !== null,
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Error al listar el equipo' });
    }
});

// POST /api/team/invite - Pre-register a vendor (invited)
router.post('/invite', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { email, nombre } = req.body;
        const tenantId = req.user.tenantId;

        if (!email) {
            return res.status(400).json({ error: 'El email es requerido' });
        }

        // Check if email already exists in any tenant
        const existing = await prisma.usuario.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Ese email ya está en uso' });
        }

        // Pre-register: password_hash = null means "pending activation"
        const vendedor = await prisma.usuario.create({
            data: {
                tenantId,
                email,
                nombre: nombre || null,
                password_hash: null,
                rol: 'vendedor',
            },
        });

        res.status(201).json({
            id: vendedor.id,
            email: vendedor.email,
            nombre: vendedor.nombre,
            rol: vendedor.rol,
            activado: false,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al invitar al colaborador' });
    }
});

// DELETE /api/team/members/:id - Remove a team member
router.delete('/members/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;

        // Prevent self-deletion
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'No puedes eliminarte a ti mismo del equipo' });
        }

        // Ensure the member belongs to this tenant
        const member = await prisma.usuario.findFirst({
            where: { id: parseInt(id), tenantId },
        });

        if (!member) {
            return res.status(404).json({ error: 'Miembro no encontrado' });
        }

        if (member.rol === 'admin') {
            return res.status(400).json({ error: 'No se puede eliminar a otro administrador' });
        }

        await prisma.usuario.delete({ where: { id: parseInt(id) } });

        res.json({ message: 'Miembro eliminado del equipo' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar al miembro' });
    }
});

module.exports = router;
