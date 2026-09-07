-- Quote Wall: give a reader's quotes a favourite flag.
--
-- The wall's UI originally showed a `likes` count and an `isLiked` flag, but
-- user_quotes is private per-reader data — no other user can see a row, so
-- there is nobody to like it. A single per-owner boolean is what that control
-- actually means.
-- AlterTable
ALTER TABLE "user_quotes" ADD COLUMN "is_favorite" BOOLEAN NOT NULL DEFAULT false;
