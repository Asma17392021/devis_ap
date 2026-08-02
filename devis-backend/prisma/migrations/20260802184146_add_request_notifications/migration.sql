-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "requestId" TEXT,
ALTER COLUMN "quoteId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
