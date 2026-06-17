-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "lastfmUsername" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastManualSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scrobble" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "track" TEXT NOT NULL,
    "scrobbledAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scrobble_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopArtist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playcount" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "TopArtist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopAlbum" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "playcount" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "TopAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopTrack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "playcount" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "TopTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LovedTrack" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "lovedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LovedTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_lastfmUsername_key" ON "User"("lastfmUsername");

-- CreateIndex
CREATE INDEX "Scrobble_userId_scrobbledAt_idx" ON "Scrobble"("userId", "scrobbledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Scrobble_userId_artist_track_scrobbledAt_key" ON "Scrobble"("userId", "artist", "track", "scrobbledAt");

-- CreateIndex
CREATE UNIQUE INDEX "TopArtist_userId_name_period_key" ON "TopArtist"("userId", "name", "period");

-- CreateIndex
CREATE UNIQUE INDEX "TopAlbum_userId_name_artist_period_key" ON "TopAlbum"("userId", "name", "artist", "period");

-- CreateIndex
CREATE UNIQUE INDEX "TopTrack_userId_name_artist_period_key" ON "TopTrack"("userId", "name", "artist", "period");

-- CreateIndex
CREATE UNIQUE INDEX "LovedTrack_userId_artist_track_key" ON "LovedTrack"("userId", "artist", "track");

-- AddForeignKey
ALTER TABLE "Scrobble" ADD CONSTRAINT "Scrobble_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopArtist" ADD CONSTRAINT "TopArtist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopAlbum" ADD CONSTRAINT "TopAlbum_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopTrack" ADD CONSTRAINT "TopTrack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LovedTrack" ADD CONSTRAINT "LovedTrack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
