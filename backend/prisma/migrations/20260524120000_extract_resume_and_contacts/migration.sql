-- AlterTable
ALTER TABLE "User" DROP COLUMN "contacts",
DROP COLUMN "resumeMimeType",
DROP COLUMN "resumeOriginalName",
DROP COLUMN "resumeSize",
DROP COLUMN "resumeUrl";

-- CreateTable
CREATE TABLE "UserResume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserResume_userId_key" ON "UserResume"("userId");

-- CreateIndex
CREATE INDEX "UserContact_userId_position_idx" ON "UserContact"("userId", "position");

-- AddForeignKey
ALTER TABLE "UserResume" ADD CONSTRAINT "UserResume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContact" ADD CONSTRAINT "UserContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
