"use client";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { ShieldAlert, Users, CreditCard, Layers, Award, Radio, Megaphone, BarChart3, Zap } from "lucide-react";
export default function ManagePage() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>
      </div>
    );
  }
  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#FF5C5C" className="mx-auto" />
        <p className="text-sm text-[#8D9BB6]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F5F8FF]">M Dashboard</h1>
        <p className="text-sm text-[#8D9BB6]">Platform yönetim paneli.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/manage/users"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#355CFF22]">
            <Users size={20} color="#355CFF" />
          </div>
          <div>
            <p className="font-medium text-[#F5F8FF]">Kullanıcılar</p>
            <p className="text-xs text-[#8D9BB6]">Rol, erişim, ban yönetimi</p>
          </div>
        </Link>
        <Link
          href="/manage/payments"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#32D66B22]">
            <CreditCard size={20} color="#32D66B" />
          </div>
          <div>
            <p className="font-medium text-[#F5F8FF]">Ödemeler</p>
            <p className="text-xs text-[#8D9BB6]">Dekont/kripto onayları</p>
          </div>
        </Link>
        <Link
          href="/manage/programs"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8A54FF22]">
            <Layers size={20} color="#8A54FF" />
          </div>
          <div>
            <p className="font-medium text-[#F5F8FF]">Programlar</p>
            <p className="text-xs text-[#8D9BB6]">Program / Modül / Ders yönetimi</p>
          </div>
        </Link>
        <Link
          href="/manage/badges"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D9A44122]">
            <Award size={20} color="#D9A441" />
          </div>
          <div>
            <p className="font-medium text-[#F5F8FF]">Rozetler</p>
            <p className="text-xs text-[#8D9BB6]">Rozet tanımları ve manuel verme</p>
          </div>
        </Link>
        <Link
          href="/manage/live-lessons"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5C5C22]">
            <Radio size={20} color="#FF5C5C" />
          </div>
          <div>
            <p className="font-medium text-[#F5F8FF]">Canlı Dersler</p>
            <p className="text-xs text-[#8D9BB6]">Discord canlı ders planla</p>
          </div>
        </Link>
        <Link
          href="/manage/announcements"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#32D6C622]">
            <Megaphone size={20} color="#32D6C6" />
          </div>
          <div>
            <p className="font-medium text-[#F5F8FF]">Duyuru Gönder</p>
            <p className="text-xs text-[#8D9BB6]">Tüm/ücretli/ücretsiz kullanıcılara bildirim</p>
          </div>
        </Link>
        <Link
          href="/manage/staff"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F39C3D22]">
            <BarChart3 size={20} color="#F39C3D" />
          </div>
          <div>
            <p className="font-medium text-[#F5F8FF]">Staff Performans</p>
            <p className="text-xs text-[#8D9BB6]">AVM personel test/satış/komisyon</p>
          </div>
        </Link>
        <Link
          href="/manage/scanner"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#355CFF22]">
            <Zap size={20} color="#355CFF" />
          </div>
          <div>
            <p className="font-medium text-[#F5F8FF]">AI Chart Scanner</p>
            <p className="text-xs text-[#8D9BB6]">Kişisel kullanım — canlı sinyal taraması</p>
          </div>
        </Link>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-[#8D9BB6]">
          Tüm yönetim bölümleri tamamlandı.
        </p>
      </div>
    </div>
  );
}
