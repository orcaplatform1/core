import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        email: true,
        role: true,
        toolsSubscription: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        bio: true,
        dateOfBirth: true,
        education: true,
        occupation: true,
        email: true,
        phone: true,
        role: true,
        toolsSubscription: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.dateOfBirth) {
      const year = new Date(dto.dateOfBirth).getFullYear();

      if (year > 2010 || year < 1966) {
        throw new BadRequestException(
          'Doğum tarihi 1966 ile 2010 yılları arasında olmalıdır (yaş 16-60 aralığı).',
        );
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        education: dto.education as any,
        occupation: dto.occupation as any,
      },
      select: {
        id: true,
        fullName: true,
        username: true,
        avatarUrl: true,
        bio: true,
        dateOfBirth: true,
        education: true,
        occupation: true,
      },
    });
  }

  async findBanned() {
    return this.prisma.user.findMany({
      where: { bannedUntil: { gt: new Date() } },
      select: {
        id: true,
        fullName: true,
        email: true,
        bannedUntil: true,
        banCount: true,
      },
    });
  }

  async unban(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    return this.prisma.user.update({
      where: { id },
      data: { bannedUntil: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        bannedUntil: true,
        banCount: true,
      },
    });
  }

  async adminUpdateIdentity(id: string, fullName?: string, username?: string) {
    const exists = await this.prisma.user.findUnique({ where: { id } });

    if (!exists) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    return this.prisma.user.update({
      where: { id },
      data: { fullName, username },
      select: { id: true, fullName: true, username: true },
    });
  }
}
