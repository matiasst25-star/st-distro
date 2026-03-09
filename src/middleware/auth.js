const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const ADMIN_EMAIL = 'matiasst25@gmail.com';

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        // Skip DB check for super-admin
        if (req.user.email === ADMIN_EMAIL) {
            return next();
        }

        // Allow /me so the frontend can check status
        if (req.baseUrl + req.path === '/api/auth/me') {
            return next();
        }

        // Check DB for tenant status
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.user.tenantId },
            select: { estado: true }
        });

        if (!tenant) {
            return res.status(401).json({ error: 'Tenant inválido' });
        }

        if (tenant.estado === 'vencido' || tenant.estado === 'pendiente') {
            return res.status(403).json({ error: 'Acceso bloqueado. Cuenta inactiva.' });
        }

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

function adminOnly(req, res, next) {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol admin.' });
    }
    next();
}

module.exports = { authMiddleware, adminOnly };
