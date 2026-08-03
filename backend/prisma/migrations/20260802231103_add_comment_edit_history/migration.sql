-- CreateTable
CREATE TABLE "CommentEdit" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "previousContent" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentEdit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CommentEdit" ADD CONSTRAINT "CommentEdit_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
