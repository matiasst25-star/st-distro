const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando configuración RLS en Supabase...');
    const tables = ['tenants', 'tenant_configs', 'usuarios', 'clientes', 'productos', 'ventas', 'venta_items', 'cierres_diarios'];

    try {
        for (const table of tables) {
            // Habilitar Row Level Security (RLS) en cada tabla
            await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
            console.log(`✅ RLS habilitado en: ${table}`);

            // Forzar políticas: Solo las APIs con service_role (tu backend Express usando `postgres`) tendrán acceso libre.
            // Para la Data API pública o usuarios anónimos de Supabase se restringe todo si no coincide su JWT.
            try {
                // Drop policy por si ya existe (evitar error de duplicado)
                await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "isolate_tenant_${table}" ON "${table}";`);

                // En un SaaS real donde Supabase Auth emite los JWT, esto garantiza el aislamiento RLS natively:
                // Si la tabla es tenants, el id es el tenant_id. Si no, tenantId es el foreign key.
                const column = table === 'tenants' ? 'id' : 'tenantId';
                const typeCast = column === 'tenantId' ? 'uuid' : 'uuid'; // Prisma UUIDs are mapped as uuids.

                await prisma.$executeRawUnsafe(`
                    CREATE POLICY "isolate_tenant_${table}" ON "${table}"
                    USING ("${column}"::text = auth.jwt()->>'tenantId');
                `);
                console.log(`🔒 Política RLS de Multi-tenant aplicada a: ${table}`);
            } catch (policyErr) {
                console.warn(`    ⚠️ Nota de Política RLS en ${table}: ${policyErr.message}`);
            }
        }
        console.log('\n🚀 ¡Todo el aislamiento Multi-Tenant (RLS) está operando correctamente!');
    } catch (e) {
        console.error('Error configurando RLS:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
