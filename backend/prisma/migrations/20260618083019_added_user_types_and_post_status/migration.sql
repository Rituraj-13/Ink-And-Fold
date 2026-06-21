/*
  Warnings:

  - You are about to drop the column `draft` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `published` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `underReview` on the `Post` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "draft",
DROP COLUMN "published",
DROP COLUMN "underReview",
ADD COLUMN     "status" "PostStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "userType" "UserType" NOT NULL DEFAULT 'USER';
