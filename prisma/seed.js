const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Crear usuario admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@smartdistro.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@smartdistro.com',
      password_hash: adminPassword,
      rol: 'admin',
    },
  });

  // Crear usuario vendedor
  const vendedorPassword = await bcrypt.hash('vendedor123', 10);
  const vendedor = await prisma.usuario.upsert({
    where: { email: 'vendedor@smartdistro.com' },
    update: {},
    create: {
      nombre: 'Juan Vendedor',
      email: 'vendedor@smartdistro.com',
      password_hash: vendedorPassword,
      rol: 'vendedor',
    },
  });

  // Crear productos de ejemplo
  const productos = [
    { nombre: 'Coca-Cola 500ml', sku: 'CC500', precio_venta: 850, precio_costo: 550, stock_actual: 120, stock_minimo: 20 },
    { nombre: 'Coca-Cola 1.5L', sku: 'CC1500', precio_venta: 1500, precio_costo: 950, stock_actual: 80, stock_minimo: 15 },
    { nombre: 'Coca-Cola 2.25L', sku: 'CC2250', precio_venta: 2100, precio_costo: 1400, stock_actual: 60, stock_minimo: 10 },
    { nombre: 'Sprite 500ml', sku: 'SP500', precio_venta: 850, precio_costo: 550, stock_actual: 90, stock_minimo: 15 },
    { nombre: 'Sprite 1.5L', sku: 'SP1500', precio_venta: 1500, precio_costo: 950, stock_actual: 45, stock_minimo: 10 },
    { nombre: 'Fanta 500ml', sku: 'FN500', precio_venta: 850, precio_costo: 550, stock_actual: 70, stock_minimo: 15 },
    { nombre: 'Agua Mineral 500ml', sku: 'AM500', precio_venta: 600, precio_costo: 350, stock_actual: 200, stock_minimo: 30 },
    { nombre: 'Agua Mineral 1.5L', sku: 'AM1500', precio_venta: 950, precio_costo: 550, stock_actual: 150, stock_minimo: 25 },
    { nombre: 'Cerveza Quilmes 1L', sku: 'CQ1000', precio_venta: 1800, precio_costo: 1200, stock_actual: 4, stock_minimo: 10 },
    { nombre: 'Cerveza Brahma 1L', sku: 'CB1000', precio_venta: 1600, precio_costo: 1050, stock_actual: 3, stock_minimo: 10 },
    { nombre: 'Vino Tinto 750ml', sku: 'VT750', precio_venta: 3500, precio_costo: 2200, stock_actual: 25, stock_minimo: 5 },
    { nombre: 'Energizante Speed 250ml', sku: 'ES250', precio_venta: 1200, precio_costo: 750, stock_actual: 2, stock_minimo: 10 },
  ];

  for (const prod of productos) {
    await prisma.producto.upsert({
      where: { sku: prod.sku },
      update: {},
      create: prod,
    });
  }

  // Crear clientes de ejemplo
  const clientes = [
    { nombre: 'Kiosco Don Pedro', telefono: '1155443322', direccion: 'Av. San Martín 1234', limite_credito: 50000, saldo_actual: 5200 },
    { nombre: 'Almacén La Esquina', telefono: '1166554433', direccion: 'Belgrano 567', limite_credito: 80000, saldo_actual: 12000 },
    { nombre: 'Bar El Rincón', telefono: '1177665544', direccion: 'Mitre 890', limite_credito: 100000, saldo_actual: 0 },
    { nombre: 'Mini Market Sur', telefono: '1188776655', direccion: 'Rivadavia 2345', limite_credito: 60000, saldo_actual: 3500 },
    { nombre: 'Despensa Central', telefono: '1199887766', direccion: 'Sarmiento 678', limite_credito: 40000, saldo_actual: 0 },
  ];

  for (const cli of clientes) {
    const exists = await prisma.cliente.findFirst({ where: { nombre: cli.nombre } });
    if (!exists) {
      await prisma.cliente.create({ data: cli });
    }
  }

  console.log('Seed completado!');
  console.log(`Admin: admin@smartdistro.com / admin123`);
  console.log(`Vendedor: vendedor@smartdistro.com / vendedor123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
