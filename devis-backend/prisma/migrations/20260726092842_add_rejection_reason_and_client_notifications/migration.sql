-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "rejectionReason" TEXT;

-- CreateTable
CREATE TABLE "client_notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "client_notifications" ADD CONSTRAINT "client_notifications_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "client_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
