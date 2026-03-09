const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register (SaaS Onboarding OR Vendor Activation)
router.post('/register', async (req, res) => {
    try {
        const { empresa, nombre, email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        // Check if email was pre-registered as an invited vendor (password_hash is null)
        const existingUser = await prisma.usuario.findUnique({ where: { email } });

        if (existingUser) {
            // Case 1: Invited vendor activating their account
            if (existingUser.password_hash === null) {
                const updated = await prisma.usuario.update({
                    where: { email },
                    data: {
                        password_hash,
                        nombre: nombre || existingUser.nombre || email.split('@')[0],
                    },
                });
                return res.status(200).json({ message: 'Cuenta activada exitosamente', usuarioId: updated.id });
            }
            // Case 2: Email already fully registered
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Case 3: Brand new company owner registering
        if (!empresa || !nombre) {
            return res.status(400).json({ error: 'Nombre de empresa y nombre son requeridos para crear una cuenta nueva' });
        }

        // Transaction: Create Tenant -> Create TenantConfig -> Create Admin User
        const result = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: { nombre: empresa },
            });

            await tx.tenantConfig.create({
                data: {
                    tenantId: tenant.id,
                    primary_color: '#5DADE2',
                    secondary_color: '#2C3E50',
                },
            });

            const usuario = await tx.usuario.create({
                data: {
                    tenantId: tenant.id,
                    nombre,
                    email,
                    password_hash,
                    rol: 'admin',
                },
            });

            return { tenant, usuario };
        });

        res.status(201).json({ message: 'Empresa registrada exitosamente', usuarioId: result.usuario.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        const usuario = await prisma.usuario.findUnique({
            where: { email },
            include: { tenant: { include: { config: true } } }
        });

        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const validPassword = await bcrypt.compare(password, usuario.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol, tenantId: usuario.tenantId },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol,
                tenantId: usuario.tenantId,
                tenantEstado: usuario.tenant.estado,
            },
            tenantConfig: usuario.tenant.config
        });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.user.id },
            select: {
                id: true, nombre: true, email: true, rol: true, tenantId: true,
                tenant: { select: { estado: true } }
            },
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const config = await prisma.tenantConfig.findUnique({
            where: { tenantId: req.user.tenantId }
        });

        const { tenant, ...rest } = usuario;
        res.json({ ...rest, tenantEstado: tenant.estado, tenantConfig: config });
    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
