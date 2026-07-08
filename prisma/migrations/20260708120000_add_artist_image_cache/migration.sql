-- CreateTable
CREATE TABLE "ArtistImageCache" (
    "id" TEXT NOT NULL,
    "artistKey" TEXT NOT NULL,
    "imageUrl" TEXT,
    "source" TEXT,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtistImageCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistImageCache_artistKey_key" ON "ArtistImageCache"("artistKey");
