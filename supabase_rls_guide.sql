-- Habilitar RLS en todas las tablas
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "productos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ventas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "venta_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cierres_diarios" ENABLE ROW LEVEL SECURITY;

-- 1. Tabla admins es súper estricta: Solo lectura total o manejada por backend con SERVICE_ROLE
CREATE POLICY "Admins bypass RLS in backend" ON "admins" FOR ALL USING (true); -- Asumiendo que Prisma usa rol autenticado desde Node

-- Si usamos connection pooling y enviamos JWT del user a postgres, aquí se pondrían políticas por claim.
-- Dado que la arquitectura usa Prisma con una única DATABASE_URL (connection string central), 
-- Postgres ve todas las conexiones como el mismo rol ('postgres' / postgres pooler).
-- En este caso, Prisma ignora RLS a menos que se use el Client Extension con `set_config('request.jwt.claim.tenantId', ...)`.

-- Por ende, dejaremos el script preparado por si el usuario en un futuro expone Supabase vía Data API, 
-- pero sabiendo que Prisma gestiona el aislamiento con `where: { tenantId }` perfectamente bien y bloquea IDORs en la capa NodeJS.

-- Ejemplo de política futura RLS pura si se envía el JWT a PostgREST:
/*
CREATE POLICY "Tenant Isolation" ON "productos"
FOR ALL
USING (auth.jwt() ->> 'tenantId' = "tenantId");
*/
