"use client";
import { useState } from "react";
import { Search, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { usePrograms } from "@/lib/hooks/use-curriculum";
import {
  useAdminUsers,
  useUpdateUserRole,
  useGrantEnrollment,
  useUnbanUser,
} from "@/lib/hooks/use-admin-users";

const ROLES = ["GUEST", "STUDENT", "STAFF", "SUPER_ADMIN"] as const;

export default function AdminUsersPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [enrollingUserId, setEnrollingUserId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  const { data: userList, isLoading } = useAdminUsers(page, 20);
  const { data: programs } = usePrograms();
  const updateRole = useUpdateUserRole();
  const grantEnrollment = useGrantEnrollment();
  const unban = useUnbanUser();

  if (authLoading) {
    return <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <Lock size={32} color="#FF5C5C" className="mx-auto" />
        <p className="text-sm text-[#8D9BB6]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  async function handleRoleChange(id: string, role: string) {
    try {
      await updateRole.mutateAsync({ id, role });
      toast.success("Rol güncellendi");
    } catch (err: any) {
      toast.error(err?.message ?? "Güncellenemedi");
    }
  }

  async function handleGrantEnrollment(id: string) {
    if (!selectedProgramId) {
      toast.error("Bir program seç");
      return;
    }
    try {
      await grantEnrollment.mutateAsync({ id, programId: selectedProgramId });
      toast.success("Erişim verildi");
      setEnrollingUserId(null);
      setSelectedProgramId("");
    } catch (err: any) {
      toast.error(err?.message ?? "Verilemedi");
    }
  }

  async function handleUnban(id: string) {
    try {
      await unban.mutateAsync(id);
      toast.success("Ban kaldırıldı");
    } catch (err: any) {
      toast.error(err?.message ?? "Kaldırılamadı");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F5F8FF]">Kullanıcılar</h1>
        <p className="text-sm text-[#8D9BB6]">
          Rol değiştir, program erişimi ver, ban kaldır.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-[#8D9BB6]">Yükleniyor...</p>
        ) : !userList || userList.data.length === 0 ? (
          <p className="p-6 text-sm text-[#8D9BB6]">Kullanıcı bulunamadı.</p>
        ) : (
          <div className="divide-y divide-border">
            {userList.data.map((u) => (
              <div key={u.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#F5F8FF]">{u.fullName}</p>
                    <p className="text-xs text-[#8D9BB6]">
                      @{u.username} · {u.email ?? "email yok"}
                    </p>
                  </div>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={updateRole.isPending || u.id === me?.id}
                    className="rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#D7E1F8] outline-none focus:border-primary"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {enrollingUserId === u.id ? (
                    <>
                      <select
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        className="rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#D7E1F8] outline-none focus:border-primary"
                      >
                        <option value="">Program seç...</option>
                        {programs?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        disabled={grantEnrollment.isPending}
                        onClick={() => handleGrantEnrollment(u.id)}
                      >
                        Ver
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEnrollingUserId(null)}>
                        İptal
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEnrollingUserId(u.id)}>
                      Program Erişimi Ver
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={unban.isPending}
                    onClick={() => handleUnban(u.id)}
                  >
                    Ban Kaldır
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {userList && userList.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Önceki
          </Button>
          <span className="text-sm text-[#8D9BB6]">
            {page} / {userList.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= userList.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sonraki
          </Button>
        </div>
      )}
    </div>
  );
}
