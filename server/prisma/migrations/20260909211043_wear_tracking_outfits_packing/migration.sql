-- CreateEnum
CREATE TYPE "CapsuleKind" AS ENUM ('trip', 'standing');

-- CreateEnum
CREATE TYPE "WearSource" AS ENUM ('manual', 'trip_auto');

-- AlterTable
ALTER TABLE "Capsule" ADD COLUMN     "climate" "Climate",
ADD COLUMN     "kind" "CapsuleKind" NOT NULL DEFAULT 'standing',
ADD COLUMN     "tempHighF" INTEGER,
ADD COLUMN     "tempLowF" INTEGER;

-- AlterTable
ALTER TABLE "ClosetItem" ADD COLUMN     "pricePaid" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "autoLogEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "BoardPosition" (
    "capsuleId" TEXT NOT NULL,
    "closetItemId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BoardPosition_pkey" PRIMARY KEY ("capsuleId","closetItemId")
);

-- CreateTable
CREATE TABLE "Outfit" (
    "id" TEXT NOT NULL,
    "capsuleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutfitItem" (
    "outfitId" TEXT NOT NULL,
    "closetItemId" TEXT NOT NULL,

    CONSTRAINT "OutfitItem_pkey" PRIMARY KEY ("outfitId","closetItemId")
);

-- CreateTable
CREATE TABLE "WearEvent" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "outfitId" TEXT,
    "source" "WearSource" NOT NULL,
    "corrected" BOOLEAN NOT NULL DEFAULT false,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WearEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WearEventItem" (
    "wearEventId" TEXT NOT NULL,
    "closetItemId" TEXT NOT NULL,

    CONSTRAINT "WearEventItem_pkey" PRIMARY KEY ("wearEventId","closetItemId")
);

-- CreateTable
CREATE TABLE "PackingItem" (
    "tripId" TEXT NOT NULL,
    "closetItemId" TEXT NOT NULL,
    "packed" BOOLEAN NOT NULL DEFAULT false,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PackingItem_pkey" PRIMARY KEY ("tripId","closetItemId")
);

-- AddForeignKey
ALTER TABLE "BoardPosition" ADD CONSTRAINT "BoardPosition_capsuleId_fkey" FOREIGN KEY ("capsuleId") REFERENCES "Capsule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardPosition" ADD CONSTRAINT "BoardPosition_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "ClosetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outfit" ADD CONSTRAINT "Outfit_capsuleId_fkey" FOREIGN KEY ("capsuleId") REFERENCES "Capsule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutfitItem" ADD CONSTRAINT "OutfitItem_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "ClosetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearEvent" ADD CONSTRAINT "WearEvent_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearEventItem" ADD CONSTRAINT "WearEventItem_wearEventId_fkey" FOREIGN KEY ("wearEventId") REFERENCES "WearEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearEventItem" ADD CONSTRAINT "WearEventItem_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "ClosetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingItem" ADD CONSTRAINT "PackingItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingItem" ADD CONSTRAINT "PackingItem_closetItemId_fkey" FOREIGN KEY ("closetItemId") REFERENCES "ClosetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
