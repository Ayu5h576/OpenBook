-- CreateEnum
CREATE TYPE "ClubRole" AS ENUM ('OWNER', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('FINISHED_BOOK', 'STARTED_BOOK', 'ADDED_TO_LIBRARY', 'WROTE_REVIEW', 'FOLLOWED_USER', 'CREATED_CLUB', 'JOINED_CLUB', 'POSTED_DISCUSSION', 'UNLOCKED_ACHIEVEMENT');

-- CreateTable
CREATE TABLE "follows" (
    "id" UUID NOT NULL,
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "book_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_clubs" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cover_image" TEXT,
    "current_book_id" UUID,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "book_clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_club_members" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ClubRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_club_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussions" (
    "id" UUID NOT NULL,
    "club_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "discussions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_comments" (
    "id" UUID NOT NULL,
    "discussion_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "achievement_key" TEXT NOT NULL,
    "unlocked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "follows_follower_id_idx" ON "follows"("follower_id");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_follower_id_following_id_key" ON "follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "activities_user_id_created_at_idx" ON "activities"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "book_clubs_owner_id_idx" ON "book_clubs"("owner_id");

-- CreateIndex
CREATE INDEX "book_club_members_club_id_idx" ON "book_club_members"("club_id");

-- CreateIndex
CREATE INDEX "book_club_members_user_id_idx" ON "book_club_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_club_members_club_id_user_id_key" ON "book_club_members"("club_id", "user_id");

-- CreateIndex
CREATE INDEX "discussions_club_id_created_at_idx" ON "discussions"("club_id", "created_at");

-- CreateIndex
CREATE INDEX "discussion_comments_discussion_id_created_at_idx" ON "discussion_comments"("discussion_id", "created_at");

-- CreateIndex
CREATE INDEX "user_achievements_user_id_idx" ON "user_achievements"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_achievement_key_key" ON "user_achievements"("user_id", "achievement_key");

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_clubs" ADD CONSTRAINT "book_clubs_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_clubs" ADD CONSTRAINT "book_clubs_current_book_id_fkey" FOREIGN KEY ("current_book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_club_members" ADD CONSTRAINT "book_club_members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "book_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_club_members" ADD CONSTRAINT "book_club_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "book_clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "discussions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
