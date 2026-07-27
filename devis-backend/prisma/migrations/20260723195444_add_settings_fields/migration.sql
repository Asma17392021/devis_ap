-- AlterTable
ALTER TABLE "company_settings" ADD COLUMN     "defaultQuoteValidityDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "notifyOnQuoteAccepted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnQuoteExpiring" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnQuoteRefused" BOOLEAN NOT NULL DEFAULT true;
