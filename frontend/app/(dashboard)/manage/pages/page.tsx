"use client";
import Link from "next/link";
import { ShieldAlert, Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { useAdminPages, useDeletePage } from "@/lib/hooks/use-admin-pages";

const ROLE_LABELS: Record<string, string> = {
  GUEST: "Misafir",
  STUDENT: "Öğrenci",
  STAFF: "Personel",
  SUPER_ADMIN: "Süper Admin",
};

export default function AdminPagesListPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const { data: pages, isLoading: loadingPages } = useAdminPages();
  const deletePage = useDeletePage();

  if (authLoading) {
    return <p className="text-sm text-[#A69B8A]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-[#A69B8A]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" sayfasını silmek istediğine emin misin?`)) return;
    try {
      await deletePage.mutateAsync(id);
      toast.success("Sayfa silindi");
    } catch (err: any) {
      toast.error(err?.message ?? "Silinemedi");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F1EA]">Sayfalar</h1>
          <p className="text-sm text-[#A69B8A]">Yasal sayfalar ve özel içerik sayfaları.</p>
        </div>
        <Button size="sm" render={<Link href="/manage/pages/new" />}>
          <Plus size={14} className="mr-1" /> Yeni Sayfa
        </Button>
      </div>

      {loadingPages ? (
        <p className="text-sm text-[#A69B8A]">Yükleniyor...</p>
      ) : !pages || pages.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
          <FileText size={32} className="mx-auto text-[#A69B8A]" />
          <p className="text-sm text-[#A69B8A]">Henüz sayfa yok.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {pages.map((page) => (
            <div key={page.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[#F5F1EA]">{page.title}</p>
                <p className="truncate text-xs text-[#A69B8A]">/{page.slug}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {page.visibility.length === 0 ? (
                  <Badge variant="outline">Herkese Açık</Badge>
                ) : (
                  page.visibility.map((role) => (
                    <Badge key={role} variant="secondary">
                      {ROLE_LABELS[role] ?? role}
                    </Badge>
                  ))
                )}
              </div>
              <Badge variant={page.showInFooter ? "default" : "outline"}>
                {page.showInFooter ? "Footer'da" : "Footer'da değil"}
              </Badge>
              <span className="text-xs text-[#A69B8A]">Sıra: {page.order}</span>
              <div className="flex items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  render={<Link href={`/manage/pages/${page.id}`} />}
                  aria-label="Düzenle"
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => handleDelete(page.id, page.title)}
                  disabled={deletePage.isPending}
                  aria-label="Sil"
                >
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
