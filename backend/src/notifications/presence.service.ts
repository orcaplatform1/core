import { Injectable } from '@nestjs/common';

export type PresenceUser = {
  id: string;
  username: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  gender: string | null;
};

// Su an aktif (socket baglantisi acik) kullanicilarin bellek-ici listesi.
// DB'ye yazmiyoruz cunku her baglanti/kopma icin ekstra yuk yaratmadan, zaten
// var olan notifications gateway baglantisindan turetiliyor.
@Injectable()
export class PresenceService {
  private readonly socketToUser = new Map<string, string>();
  private readonly activeUsers = new Map<string, { info: PresenceUser; socketCount: number }>();

  addSocket(socketId: string, info: PresenceUser) {
    this.socketToUser.set(socketId, info.id);
    const existing = this.activeUsers.get(info.id);
    if (existing) {
      existing.socketCount += 1;
      existing.info = info;
    } else {
      this.activeUsers.set(info.id, { info, socketCount: 1 });
    }
  }

  isOnline(userId: string): boolean {
    return this.activeUsers.has(userId);
  }

  removeSocket(socketId: string) {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return;
    this.socketToUser.delete(socketId);
    const existing = this.activeUsers.get(userId);
    if (!existing) return;
    existing.socketCount -= 1;
    if (existing.socketCount <= 0) this.activeUsers.delete(userId);
  }

  // Sira: staff/superadmin her zaman en ustte, sonra kadin ogrenciler, sonra
  // erkek ogrenciler, satin alim yapmamis (GUEST) kullanicilar en altta.
  getActive(): PresenceUser[] {
    const rank = (u: PresenceUser) => {
      if (u.role === 'STAFF' || u.role === 'SUPER_ADMIN') return 0;
      if (u.role === 'STUDENT' && u.gender === 'KADIN') return 1;
      if (u.role === 'STUDENT') return 2;
      return 3;
    };
    return Array.from(this.activeUsers.values())
      .map((v) => v.info)
      .sort((a, b) => {
        const diff = rank(a) - rank(b);
        if (diff !== 0) return diff;
        return (a.fullName || '').localeCompare(b.fullName || '', 'tr');
      });
  }
}
