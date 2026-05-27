/*
  Warnings:

  - You are about to alter the column `content` on the `Comment` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2000)`.
  - You are about to alter the column `content` on the `Post` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5000)`.
  - You are about to alter the column `title` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `description` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5000)`.
  - You are about to alter the column `goals` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5000)`.
  - You are about to alter the column `message` on the `ProjectApplication` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1000)`.
  - You are about to alter the column `bio` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2000)`.
  - You are about to alter the column `university` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `course` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `faculty` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `value` on the `UserContact` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.

*/
-- AlterTable
ALTER TABLE "Comment" ALTER COLUMN "content" SET DATA TYPE VARCHAR(2000);

-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "content" SET DATA TYPE VARCHAR(5000);

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "title" SET DATA TYPE VARCHAR(500),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(5000),
ALTER COLUMN "goals" SET DATA TYPE VARCHAR(5000);

-- AlterTable
ALTER TABLE "ProjectApplication" ALTER COLUMN "message" SET DATA TYPE VARCHAR(1000);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "bio" SET DATA TYPE VARCHAR(2000),
ALTER COLUMN "university" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "course" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "faculty" SET DATA TYPE VARCHAR(200);

-- AlterTable
ALTER TABLE "UserContact" ALTER COLUMN "value" SET DATA TYPE VARCHAR(500);
