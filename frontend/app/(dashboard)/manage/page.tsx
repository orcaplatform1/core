"use client";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { ShieldAlert, Users, CreditCard, Layers, Award, Radio, Megaphone, BarChart3, Zap, Globe } from "lucide-react";
export default function ManagePage() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-[#A69B8A]">Yükleniyor...</p>
      </div>
    );
  }
  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-[#A69B8A]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F5F1EA]">M Dashboard</h1>
        <p className="text-sm text-[#A69B8A]">Platform yönetim paneli.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/manage/users"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B5BFF22]">
            <Users size={20} color="#3B5BFF" />
          </div>
          <div>
            <p className="font-medium text-[#F5F1EA]">Kullanıcılar</p>
            <p className="text-xs text-[#A69B8A]">Rol, erişim, ban yönetimi</p>
          </div>
        </Link>
        <Link
          href="/manage/payments"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22C55E22]">
            <CreditCard size={20} color="#22C55E" />
          </div>
          <div>
            <p className="font-medium text-[#F5F1EA]">Ödemeler</p>
            <p className="text-xs text-[#A69B8A]">Dekont/kripto onayları</p>
          </div>
        </Link>
        <Link
          href="/manage/programs"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF622]">
            <Layers size={20} color="#8B5CF6" />
          </div>
          <div>
            <p className="font-medium text-[#F5F1EA]">Programlar</p>
            <p className="text-xs text-[#A69B8A]">Program / Modül / Ders yönetimi</p>
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
            <p className="font-medium text-[#F5F1EA]">Rozetler</p>
            <p className="text-xs text-[#A69B8A]">Rozet tanımları ve manuel verme</p>
          </div>
        </Link>
        <Link
          href="/manage/live-lessons"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EF444422]">
            <Radio size={20} color="#EF4444" />
          </div>
          <div>
            <p className="font-medium text-[#F5F1EA]">Canlı Dersler</p>
            <p className="text-xs text-[#A69B8A]">Discord canlı ders planla</p>
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
            <p className="font-medium text-[#F5F1EA]">Duyuru Gönder</p>
            <p className="text-xs text-[#A69B8A]">Tüm/ücretli/ücretsiz kullanıcılara bildirim</p>
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
            <p className="font-medium text-[#F5F1EA]">Staff Performans</p>
            <p className="text-xs text-[#A69B8A]">AVM personel test/satış/komisyon</p>
          </div>
        </Link>
        <Link
          href="/manage/scanner"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B5BFF22]">
            <Zap size={20} color="#3B5BFF" />
          </div>
          <div>
            <p className="font-medium text-[#F5F1EA]">AI Chart Scanner</p>
            <p className="text-xs text-[#A69B8A]">Kişisel kullanım — canlı sinyal taraması</p>
          </div>
        </Link>
        <Link
          href="/manage/site-content"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 hover:border-primary transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#32D6C622]">
            <Globe size={20} color="#32D6C6" />
          </div>
          <div>
            <p className="font-medium text-[#F5F1EA]">Site İçeriği</p>
            <p className="text-xs text-[#A69B8A]">Landing page, header, footer, logo ve favicon yönetimi</p>
          </div>
        </Link>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-[#A69B8A]">
          Tüm yönetim bölümleri tamamlandı.
        </p>
      </div>
    </div>
  );
}
