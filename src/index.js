require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const prisma = require('./lib/prisma');

const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const clientesRoutes = require('./routes/clientes');
const ventasRoutes = require('./routes/ventas');
const dashboardRoutes = require('./routes/dashboard');
const cierresRoutes = require('./routes/cierres');
const adminRoutes = require('./routes/admin');
const teamRoutes = require('./routes/team');
const reportesRoutes = require('./routes/reportes');
const gastosRoutes = require('./routes/gastos');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'https://st-distro.vercel.app'],
    credentials: true,
}));
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cierres', cierresRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/gastos', gastosRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Configurar cierre automático diario a las 00:00
cron.schedule('0 0 * * *', async () => {
    try {
        const tenants = await prisma.tenant.findMany({
            include: { ventas: { where: { cierreDiarioId: null }, include: { items: { include: { producto: true } } } } }
        });

        let cierresRealizados = 0;
        for (const tenant of tenants) {
            if (tenant.ventas.length === 0) continue;

            const totalVendido = tenant.ventas.reduce((sum, v) => sum + Number(v.total), 0);
            const productosVendidos = [];

            tenant.ventas.forEach(v => {
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

            await prisma.$transaction(async (tx) => {
                const cierre = await tx.cierreDiario.create({
                    data: {
                        tenantId: tenant.id,
                        fecha: new Date(),
                        total_vendido: totalVendido,
                        productos_vendidos: productosVendidos
                    }
                });
                await tx.venta.updateMany({
                    where: { tenantId: tenant.id, cierreDiarioId: null },
                    data: { cierreDiarioId: cierre.id }
                });
            });
            cierresRealizados++;
        }
    } catch (error) {
    }
});

app.listen(PORT, () => { });
