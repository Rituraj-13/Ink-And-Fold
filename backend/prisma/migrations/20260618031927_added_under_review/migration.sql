-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "flaggedMetrics" TEXT[],
ADD COLUMN     "underReview" BOOLEAN NOT NULL DEFAULT false;
