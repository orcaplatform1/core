import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NOT_DELETED_USER_WHERE } from '../common/deleted-user';
import { CreatePostDto } from './dto/create-post.dto';
import { GetPostUploadUrlDto } from './dto/get-post-upload-url.dto';
import { COMMUNITY_REPORT_THRESHOLD } from './community.constants';

const POST_USER_SELECT = { id: true, username: true, fullName: true, avatarUrl: true } as const;

const POST_SELECT = {
  id: true,
  imageUrl: true,
  title: true,
  description: true,
  symbol: true,
  timeframe: true,
  direction: true,
  ictTags: true,
  createdAt: true,
  hiddenAt: true,
  user: { select: POST_USER_SELECT },
  likes: { select: { userId: true, type: true } },
  _count: { select: { comments: true } },
};

@Injectable()
export class CommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly auditLog: AuditLogService,
  ) {}

  // "Bir programi satin almis (enrollment'i olan) ogrenci" kontrolu - mentor
  // modulundeki ayni desenin birebir aynisi (bkz. mentor.service.ts ensureAccess).
  private async ensureEnrolled(userId: string) {
    const enrollmentCount = await this.prisma.enrollment.count({ where: { userId } });
    if (enrollmentCount === 0) {
      throw new ForbiddenException(
        'Bu özellik yalnızca bir eğitim programına kayıtlı öğrenciler içindir.',
      );
    }
  }

  private shapePost(p: any, userId?: string) {
    const likes = p.likes.filter((r: any) => r.type === 'LIKE').length;
    const dislikes = p.likes.filter((r: any) => r.type === 'DISLIKE').length;
    const myReaction = userId ? p.likes.find((r: any) => r.userId === userId)?.type ?? null : null;
    return {
      id: p.id,
      imageUrl: p.imageUrl,
      title: p.title,
      description: p.description,
      symbol: p.symbol,
      timeframe: p.timeframe,
      direction: p.direction,
      ictTags: p.ictTags,
      createdAt: p.createdAt,
      user: p.user,
      likes,
      dislikes,
      myReaction,
      commentsCount: p._count.comments,
    };
  }

  async listFeed(
    userId: string | undefined,
    opts: { sort?: string; symbol?: string; page?: number; limit?: number },
  ) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 50) : 20;

    const where = {
      hiddenAt: null,
      user: NOT_DELETED_USER_WHERE,
      ...(opts.symbol ? { symbol: { equals: opts.symbol, mode: 'insensitive' as const } } : {}),
    };

    const posts = await this.prisma.communityPost.findMany({
      where,
      select: POST_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    const shaped = posts.map((p) => this.shapePost(p, userId));
    if (opts.sort === 'top') {
      shaped.sort((a, b) => b.likes - a.likes || b.createdAt.getTime() - a.createdAt.getTime());
    }

    const total = shaped.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const pageItems = shaped.slice(skip, skip + limit);

    const viewer = { isAuthenticated: !!userId, isEnrolled: false };
    if (userId) {
      const enrollmentCount = await this.prisma.enrollment.count({ where: { userId } });
      viewer.isEnrolled = enrollmentCount > 0;
    }

    return { posts: pageItems, pagination: { page, limit, total, totalPages }, viewer };
  }

  async getUploadUrl(userId: string, dto: GetPostUploadUrlDto) {
    await this.ensureEnrolled(userId);
    return this.storage.getUploadUrl(dto.fileName, dto.contentType, 'community-posts', dto.fileSizeBytes);
  }

  async create(userId: string, dto: CreatePostDto) {
    await this.ensureEnrolled(userId);
    if (!dto.disclaimerAccepted) {
      throw new BadRequestException(
        'Paylaşım gönderilmeden önce eğitim amaçlı olduğunu onaylayan kutuyu işaretlemelisiniz.',
      );
    }

    const post = await this.prisma.communityPost.create({
      data: {
        userId,
        imageUrl: dto.imageUrl,
        title: dto.title,
        description: dto.description,
        symbol: dto.symbol.trim().toUpperCase(),
        timeframe: dto.timeframe,
        direction: dto.direction,
        ictTags: dto.ictTags,
      },
      select: POST_SELECT,
    });
    return this.shapePost(post, userId);
  }

  async react(postId: string, userId: string, type: 'LIKE' | 'DISLIKE') {
    await this.ensureEnrolled(userId);
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post || post.hiddenAt) throw new NotFoundException('Paylaşım bulunamadı.');

    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (!existing) {
      await this.prisma.postLike.create({ data: { postId, userId, type } });
    } else if (existing.type === type) {
      await this.prisma.postLike.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.postLike.update({ where: { id: existing.id }, data: { type } });
    }

    const fresh = await this.prisma.postLike.findMany({ where: { postId }, select: { type: true } });
    return {
      likes: fresh.filter((r) => r.type === 'LIKE').length,
      dislikes: fresh.filter((r) => r.type === 'DISLIKE').length,
    };
  }

  async listComments(postId: string, page = 1, limit = 20) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post || post.hiddenAt) throw new NotFoundException('Paylaşım bulunamadı.');

    const skip = (page - 1) * limit;
    const where = { postId, user: NOT_DELETED_USER_WHERE };
    const [data, total] = await Promise.all([
      this.prisma.postComment.findMany({
        where,
        select: { id: true, text: true, createdAt: true, user: { select: POST_USER_SELECT } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.postComment.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  async addComment(postId: string, userId: string, text: string) {
    await this.ensureEnrolled(userId);
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post || post.hiddenAt) throw new NotFoundException('Paylaşım bulunamadı.');

    return this.prisma.postComment.create({
      data: { postId, userId, text },
      select: { id: true, text: true, createdAt: true, user: { select: POST_USER_SELECT } },
    });
  }

  async report(postId: string, reporterId: string, reason: string) {
    await this.ensureEnrolled(reporterId);
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Paylaşım bulunamadı.');

    try {
      await this.prisma.postReport.create({ data: { postId, reporterId, reason } });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new BadRequestException('Bu paylaşımı zaten şikayet ettiniz.');
      }
      throw err;
    }

    const reportCount = await this.prisma.postReport.count({ where: { postId } });

    if (reportCount >= COMMUNITY_REPORT_THRESHOLD && !post.hiddenAt) {
      await this.prisma.communityPost.update({ where: { id: postId }, data: { hiddenAt: new Date() } });

      const admins = await this.prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
      await Promise.all(
        admins.map((a) =>
          this.notifications.create({
            userId: a.id,
            type: 'SYSTEM',
            title: 'Topluluk paylaşımı otomatik gizlendi',
            message: `"${post.title}" başlıklı paylaşım ${reportCount} şikayet alarak otomatik gizlendi ve moderasyon kuyruğuna düştü.`,
            link: '/manage/community',
          }),
        ),
      );
    }

    return { success: true, reportCount };
  }

  async listHidden() {
    return this.prisma.communityPost.findMany({
      where: { hiddenAt: { not: null } },
      select: {
        ...POST_SELECT,
        reports: {
          select: {
            id: true,
            reason: true,
            status: true,
            createdAt: true,
            reporter: { select: POST_USER_SELECT },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { hiddenAt: 'desc' },
    });
  }

  async restore(postId: string, actorId: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Paylaşım bulunamadı.');

    await this.prisma.$transaction([
      this.prisma.communityPost.update({ where: { id: postId }, data: { hiddenAt: null } }),
      this.prisma.postReport.updateMany({ where: { postId }, data: { status: 'RESOLVED' } }),
    ]);
    await this.auditLog.log(actorId, 'COMMUNITY_POST_RESTORE', 'CommunityPost', postId, { title: post.title });
    return { success: true };
  }

  async removePermanently(postId: string, actorId: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Paylaşım bulunamadı.');

    await this.prisma.communityPost.delete({ where: { id: postId } });
    await this.auditLog.log(actorId, 'COMMUNITY_POST_DELETE', 'CommunityPost', postId, {
      title: post.title,
      userId: post.userId,
    });
    return { success: true };
  }
}
