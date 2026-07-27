-- AlterTable
ALTER TABLE "quote_requests" ADD COLUMN     "vehicleMake" TEXT,
ADD COLUMN     "vehicleMileage" INTEGER,
ADD COLUMN     "vehicleModel" TEXT,
ADD COLUMN     "vehicleVin" TEXT,
ADD COLUMN     "vehicleYear" INTEGER;

-- CreateTable
CREATE TABLE "quote_request_attachments" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "quote_request_attachments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "quote_request_attachments" ADD CONSTRAINT "quote_request_attachments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
