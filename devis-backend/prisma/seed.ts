import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Démarrage du seed...')

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@monentreprise.com'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'AdminPassword123!'
  const adminFirstName = process.env.ADMIN_FIRST_NAME ?? 'Admin'
  const adminLastName = process.env.ADMIN_LAST_NAME ?? 'Système'

  // Upsert admin user
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      firstName: adminFirstName,
      lastName: adminLastName,
    },
  })

  console.log(`✅ Admin créé : ${admin.email}`)

  // Create default company settings (singleton)
  await prisma.companySettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      name: 'Mon Entreprise',
      email: adminEmail,
    },
  })

  console.log('✅ Paramètres entreprise initialisés')
  console.log('🎉 Seed terminé')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
