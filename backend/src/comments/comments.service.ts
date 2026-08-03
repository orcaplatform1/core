import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SuspensionsService } from '../suspensions/suspensions.service';
import { CreateCommentDto } from './dto/create-comment.dto';

const COMMENT_SELECT = {
  id: true,
  content: true,
  status: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  editedAt: true,
  userId: true,
  user: { select: { id: true, username: true, fullName: true, avatarUrl: true, role: true } },
  reactions: { select: { userId: true, type: true } },
  edits: { select: { previousContent: true, editedAt: true }, orderBy: { editedAt: 'asc' as const } },
};

const MENTION_REGEX = /@([a-zA-Z0-9_]{2,30})/g;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly suspensions: SuspensionsService,
  ) {}

  // Reddit tarzi "best" siralamasi: Wilson score alt siniri. Sadece begeni sayisina
  // gore siralamak (45 begeni/25 begenmeme) az ama dengeli begeniye sahip bir yorumu
  // (21 begeni/4 begenmeme) haksiz yere geride birakiyordu - bu formul istatistiksel
  // olarak "gercekten begenilme orani" konusunda daha guvenilir olani one cikarir.
  private wilsonScore(likes: number, dislikes: number): number {
    const n = likes + dislikes;
    if (n === 0) return 0;
    const z = 1.96;
    const p = likes / n;
    const z2 = z * z;
    const numerator = p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
    const denominator = 1 + z2 / n;
    return numerator / denominator;
  }

  private shapeComment(c: any) {
    const likes = c.reactions.filter((r: any) => r.type === 'LIKE').length;
    const dislikes = c.reactions.filter((r: any) => r.type === 'DISLIKE').length;
    return {
      id: c.id,
      content: c.content,
      status: c.status,
      parentId: c.parentId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      editedAt: c.editedAt,
      user: c.user,
      likes,
      dislikes,
      score: this.wilsonScore(likes, dislikes),
      edits: c.edits ?? [],
      replies: (c.replies ?? []).map((r: any) => this.shapeComment(r)),
    };
  }

  async listForLesson(lessonId: string, userId: string, page = 1, limit = 15) {
    // Birbirini engelleyen kullanicilar birbirinin yorumlarini gormesin - iki yonlu
    // (ben kimi engelledim + beni kim engelledi) kontrol edilip gizli userId kumesi cikarilir.
    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const hiddenUserIds = [
      ...new Set(blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId))),
    ];

    const [topLevel, myPending] = await Promise.all([
      this.prisma.comment.findMany({
        where: { lessonId, parentId: null, status: 'APPROVED', userId: { notIn: hiddenUserIds } },
        select: {
          ...COMMENT_SELECT,
          replies: {
            where: { status: 'APPROVED', userId: { notIn: hiddenUserIds } },
            select: COMMENT_SELECT,
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.comment.findMany({
        where: { lessonId, userId, status: { in: ['PENDING', 'REJECTED'] } },
        select: { ...COMMENT_SELECT, replies: { select: COMMENT_SELECT, orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const shaped = topLevel.map((c) => this.shapeComment(c));

    // En cok begenilen 3 yorum (Wilson skoruna gore) en tepede sabitlenir - ama en az
    // bir reaksiyon almamis (score=0) yorumlar anlamsizca sabitlenmesin diye elenir.
    const withReactions = shaped.filter((c) => c.likes + c.dislikes > 0);
    const pinned = [...withReactions].sort((a, b) => b.score - a.score).slice(0, 3);
    const pinnedIds = new Set(pinned.map((c) => c.id));
    const rest = shaped.filter((c) => !pinnedIds.has(c.id)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // "total" gorunen sayac icin TUM ust-seviye onayli yorumlari sayar (sabitlenmis
    // olanlar dahil) - sayfalama ise sadece "rest" (sabitlenmemis) listesi uzerinden
    // yapilir, cunku sabitlenenler zaten ayri gosteriliyor.
    const total = shaped.length;
    const totalPages = Math.max(1, Math.ceil(rest.length / limit));
    const skip = (page - 1) * limit;
    const pageItems = rest.slice(skip, skip + limit);
    const suspension = await this.suspensions.getActive(userId, 'COMMENT');

    return {
      pinned: page === 1 ? pinned : [],
      comments: pageItems,
      myPending: myPending.map((c) => this.shapeComment(c)),
      pagination: { page, limit, total, totalPages },
      suspendedMessage: suspension ? this.suspensions.buildBanMessage('yorum', suspension.expiresAt) : null,
    };
  }

  async create(lessonId: string, userId: string, role: string, dto: CreateCommentDto) {
    const activeSuspension = await this.suspensions.getActive(userId, 'COMMENT');
    if (activeSuspension) {
      throw new ForbiddenException(this.suspensions.buildBanMessage('yorum', activeSuspension.expiresAt));
    }

    let parentId = dto.parentId ?? null;
    if (parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.lessonId !== lessonId) throw new NotFoundException('Cevap verilecek yorum bulunamadı.');
      // Yorumlar tek seviye gosteriliyor (YouTube tarzi) - bir cevaba cevap verilirse
      // otomatik olarak ayni ust yoruma baglanir, sonsuz iç ice gecme onlenir.
      parentId = parent.parentId ?? parent.id;
    }

    // STAFF/SUPER_ADMIN yorumu direkt yayinlanir, STUDENT yorumu moderasyon bekler.
    const status = role === 'STUDENT' ? 'PENDING' : 'APPROVED';

    const comment = await this.prisma.comment.create({
      data: { lessonId, userId, parentId, content: dto.content, status },
      select: { ...COMMENT_SELECT, replies: { select: COMMENT_SELECT } },
    });

    if (status === 'APPROVED') {
      await this.afterApproved(comment.id);
    }

    return this.shapeComment(comment);
  }

  async report(commentId: string, reporterId: string, reason: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Yorum bulunamadı.');

    const report = await this.prisma.commentReport.create({ data: { commentId, reporterId, reason } });

    const admins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
    const reporter = await this.prisma.user.findUnique({ where: { id: reporterId }, select: { fullName: true } });
    await Promise.all(
      admins.map((a) =>
        this.notifications.create({
          userId: a.id,
          type: 'SYSTEM',
          title: 'Yeni yorum şikayeti',
          message: `${reporter?.fullName ?? 'Bir kullanıcı'} bir yorumu şikayet etti: "${reason}"`,
          link: '/manage/comments',
        }),
      ),
    );
    return report;
  }

  async listReports(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.commentReport.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, reason: true, createdAt: true,
          reporter: { select: { id: true, fullName: true, username: true } },
          comment: {
            select: {
              id: true, content: true, createdAt: true,
              user: { select: { id: true, fullName: true, username: true } },
              lesson: { select: { id: true, title: true } },
            },
          },
        },
      }),
      this.prisma.commentReport.count(),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async react(commentId: string, userId: string, type: 'LIKE' | 'DISLIKE') {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.status !== 'APPROVED') throw new NotFoundException('Yorum bulunamadı.');

    const existing = await this.prisma.commentReaction.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (!existing) {
      await this.prisma.commentReaction.create({ data: { commentId, userId, type } });
    } else if (existing.type === type) {
      // ayni butona tekrar basmak reaksiyonu geri alir (toggle-off)
      await this.prisma.commentReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.commentReaction.update({ where: { id: existing.id }, data: { type } });
    }

    const fresh = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { reactions: { select: { userId: true, type: true } } },
    });
    const likes = fresh!.reactions.filter((r) => r.type === 'LIKE').length;
    const dislikes = fresh!.reactions.filter((r) => r.type === 'DISLIKE').length;
    return { likes, dislikes };
  }

  // Sadece yorumu yazan kisi duzenleyebilir. Icerik degisikligi moderasyon durumunu
  // etkilemez - onayli bir yorum duzenlense bile tekrar onaya dusmez (STAFF/SUPER_ADMIN
  // her an "duzenlendi" etiketinden hangi yorumlarin sonradan degistigini gorebiliyor).
  async edit(commentId: string, userId: string, content: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Yorum bulunamadı.');
    if (comment.userId !== userId) throw new ForbiddenException('Sadece kendi yorumunuzu düzenleyebilirsiniz.');

    await this.prisma.commentEdit.create({
      data: { commentId, previousContent: comment.content },
    });
    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content, editedAt: new Date() },
      select: { ...COMMENT_SELECT, replies: { select: COMMENT_SELECT } },
    });
    return this.shapeComment(updated);
  }

  // STAFF sadece kendi yazdigi yorumu/cevabi silebilir, SUPER_ADMIN herkesinkini silebilir.
  async remove(commentId: string, actorId: string, actorRole: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Yorum bulunamadı.');
    if (actorRole !== 'SUPER_ADMIN' && comment.userId !== actorId) {
      throw new ForbiddenException('Sadece kendi yorumunuzu silebilirsiniz.');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  }

  async listForModeration(status: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.prisma.comment.findMany({
      where: { status },
      select: {
        ...COMMENT_SELECT,
        lesson: { select: { id: true, title: true, module: { select: { title: true, program: { select: { title: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async moderate(commentId: string, status: 'APPROVED' | 'REJECTED') {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Yorum bulunamadı.');
    if (comment.status !== 'PENDING') throw new ForbiddenException('Bu yorum zaten değerlendirilmiş.');

    await this.prisma.comment.update({ where: { id: commentId }, data: { status } });
    if (status === 'APPROVED') {
      await this.afterApproved(commentId);
    }
    return { success: true };
  }

  // Bir yorum yayinlandiginda (direkt STAFF/SUPER_ADMIN yorumuysa aninda, STUDENT
  // yorumuysa onaylaninca) iki bildirim turu tetiklenir: cevap verilen yorumun
  // sahibine (kendi kendine cevap vermedigi surece) ve metinde @kullaniciadi ile
  // etiketlenen herkese.
  private async afterApproved(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        lesson: { select: { id: true, title: true, module: { select: { programId: true } } } },
        user: { select: { username: true } },
      },
    });
    if (!comment) return;
    const link = `/courses/${comment.lesson.module.programId}/lessons/${comment.lesson.id}`;

    if (comment.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: comment.parentId } });
      if (parent && parent.userId !== comment.userId) {
        await this.notifications.create({
          userId: parent.userId,
          type: 'COMMENT_REPLY',
          title: 'Yorumunuza cevap geldi',
          message: `${comment.user.username ?? 'Bir kullanıcı'}, "${comment.lesson.title}" dersinde yorumunuza cevap verdi.`,
          link,
        });
      }
    }

    const mentioned = new Set(
      [...comment.content.matchAll(MENTION_REGEX)].map((m) => m[1].toLowerCase()),
    );
    if (mentioned.size === 0) return;

    const users = await this.prisma.user.findMany({
      where: { username: { in: [...mentioned], mode: 'insensitive' } },
      select: { id: true, username: true },
    });
    for (const u of users) {
      if (u.id === comment.userId) continue;
      await this.notifications.create({
        userId: u.id,
        type: 'COMMENT_MENTION',
        title: 'Bir yorumda etiketlendiniz',
        message: `${comment.user.username ?? 'Bir kullanıcı'}, "${comment.lesson.title}" dersinde sizi bir yorumda etiketledi.`,
        link,
      });
    }
  }
}
