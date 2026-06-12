/* eslint-disable no-console */
// Development seed: one approved provider/garage/supplier ecosystem plus
// pricing for Dubai & Sharjah. Safe to re-run (idempotent upserts by phone).
import { PrismaClient, Prisma, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function userWithRoles(phone: string, fullName: string, roles: Role[]) {
  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: { phone, fullName },
  });
  for (const role of roles) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      update: {},
      create: { userId: user.id, role },
    });
  }
  return user;
}

async function main() {
  // --- pricing ---
  for (const emirate of ['Dubai', 'Sharjah']) {
    const exists = await prisma.pricingConfig.findFirst({ where: { emirate, isActive: true } });
    if (!exists) {
      await prisma.pricingConfig.create({
        data: {
          emirate,
          baseRecoveryFee: new Prisma.Decimal('200.00'),
          perKmFee: new Prisma.Decimal('5.00'),
          diagnosticFee: new Prisma.Decimal('100.00'),
        },
      });
    }
  }

  // --- platform admin ---
  await userWithRoles('+971500000001', 'Platform Admin', [Role.ADMIN]);

  // --- recovery provider + driver + truck ---
  const providerAdmin = await userWithRoles('+971500000002', 'Rashid Recovery Owner', [Role.PROVIDER_ADMIN]);
  let provider = await prisma.providerProfile.findFirst({ where: { tradeLicenceNo: 'DXB-RT-100001' } });
  if (!provider) {
    provider = await prisma.providerProfile.create({
      data: {
        companyName: 'Rashid Recovery Services LLC',
        tradeLicenceNo: 'DXB-RT-100001',
        phone: '+971500000002',
        verification: 'APPROVED',
        verifiedAt: new Date(),
      },
    });
  }
  await prisma.user.update({ where: { id: providerAdmin.id }, data: { providerProfileId: provider.id } });

  const driverUser = await userWithRoles('+971500000003', 'Yusuf Driver', [Role.RECOVERY_DRIVER]);
  await prisma.user.update({ where: { id: driverUser.id }, data: { providerProfileId: provider.id } });
  await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: { userId: driverUser.id, providerId: provider.id, licenceNo: 'DXB-DL-555001', isAvailable: true },
  });
  await prisma.recoveryVehicle.upsert({
    where: { providerId_plateNumber: { providerId: provider.id, plateNumber: '54321' } },
    update: {},
    create: { providerId: provider.id, plateNumber: '54321', truckType: 'flatbed', verification: 'APPROVED' },
  });

  // --- garage + manager + technician ---
  let garage = await prisma.garage.findFirst({ where: { tradeLicenceNo: 'DXB-GR-200001' } });
  if (!garage) {
    garage = await prisma.garage.create({
      data: {
        name: 'Al Quoz Auto Care',
        tradeLicenceNo: 'DXB-GR-200001',
        phone: '+971500000004',
        emirate: 'Dubai',
        address: 'Al Quoz Industrial Area 3, Dubai',
        lat: new Prisma.Decimal('25.137800'),
        lng: new Prisma.Decimal('55.227700'),
        verification: 'APPROVED',
        verifiedAt: new Date(),
      },
    });
  }
  const garageManager = await userWithRoles('+971500000004', 'Garage Manager', [Role.GARAGE_MANAGER]);
  const techUser = await userWithRoles('+971500000005', 'Garage Technician', [Role.GARAGE_TECHNICIAN]);
  await prisma.user.update({ where: { id: garageManager.id }, data: { garageId: garage.id } });
  await prisma.user.update({ where: { id: techUser.id }, data: { garageId: garage.id } });
  await prisma.technician.upsert({
    where: { userId: techUser.id },
    update: {},
    create: { userId: techUser.id, garageId: garage.id, speciality: 'General mechanical' },
  });

  // --- supplier + catalogue ---
  let supplier = await prisma.supplier.findFirst({ where: { tradeLicenceNo: 'SHJ-SP-300001' } });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        name: 'Gulf Auto Parts Trading',
        tradeLicenceNo: 'SHJ-SP-300001',
        phone: '+971500000006',
        emirate: 'Sharjah',
        verification: 'APPROVED',
        verifiedAt: new Date(),
      },
    });
  }
  const supplierUser = await userWithRoles('+971500000006', 'Parts Supplier', [Role.SUPPLIER]);
  await prisma.user.update({ where: { id: supplierUser.id }, data: { supplierId: supplier.id } });

  const partDefs = [
    { oemNumber: '04465-06100', name: 'Front brake pad set', category: 'brakes' },
    { oemNumber: '16400-0V040', name: 'Radiator assembly', category: 'cooling' },
    { oemNumber: '28100-0H110', name: 'Starter motor', category: 'electrical' },
  ];
  for (const def of partDefs) {
    let part = await prisma.sparePart.findFirst({ where: { oemNumber: def.oemNumber } });
    if (!part) {
      part = await prisma.sparePart.create({ data: def });
      await prisma.partCompatibility.create({
        data: { sparePartId: part.id, make: 'Toyota', model: 'Camry', yearFrom: 2018, yearTo: 2024 },
      });
      const offers = [
        { condition: 'OEM_GENUINE', brand: 'Toyota Genuine', price: '450.00', warrantyMonths: 12, deliveryEtaHours: 24 },
        { condition: 'AFTERMARKET_PREMIUM', brand: 'Bosch', price: '280.00', warrantyMonths: 12, deliveryEtaHours: 24 },
        { condition: 'AFTERMARKET_STANDARD', brand: 'CTR', price: '160.00', warrantyMonths: 6, deliveryEtaHours: 48 },
      ] as const;
      for (const offer of offers) {
        await prisma.supplierInventory.create({
          data: {
            supplierId: supplier.id,
            sparePartId: part.id,
            condition: offer.condition,
            brand: offer.brand,
            price: new Prisma.Decimal(offer.price),
            stockQty: 10,
            warrantyMonths: offer.warrantyMonths,
            deliveryEtaHours: offer.deliveryEtaHours,
          },
        });
      }
    }
  }

  console.log('Seed complete.');
  console.log('Login phones (OTP printed to API console in dev):');
  console.log('  admin     +971500000001');
  console.log('  driver    +971500000003');
  console.log('  garage    +971500000004 (manager), +971500000005 (technician)');
  console.log('  supplier  +971500000006');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
