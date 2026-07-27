-- AlterTable
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN     "activationToken" TEXT;
ALTER TABLE "users" ADD COLUMN     "activationTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "users_activationToken_key" ON "users"("activationToken");
