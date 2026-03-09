require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Set all existing tenants to 'activo' so they aren't blocked
    const result = await prisma.tenant.updateMany({
        where: { estado: 'pendiente' },
        data: {
            estado: 'activo',
            plan_tipo: 'crecimiento',
            fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        },
    });
    console.log('Tenants activados:', result.count);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
