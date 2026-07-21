"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldX, Award } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { AuthShell } from "@/components/layout/auth-shell";

type VerifyResult = {
  valid: boolean;
  code?: string;
  number?: number;
  studentName?: string;
  programTitle?: string;
  issuedAt?: string;
};

export default function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { data, isLoading } = useQuery({
    queryKey: ["certificates", "verify", code],
    queryFn: () => apiClient<VerifyResult>(`/certificates/verify/${code}`, { auth: false }),
  });

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-md rounded-2xl border border-primary/15 bg-card p-8 text-center shadow-lg">
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-secondary" />
        ) : data?.valid ? (
          <>
            <ShieldCheck className="mx-auto size-10 text-success" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Sertifika Doğrulandı</h1>
            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-secondary p-5 text-left">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Award className="size-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">{data.code}</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sertifika Sahibi</p>
                <p className="text-sm font-medium text-foreground">{data.studentName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Program</p>
                <p className="text-sm font-medium text-foreground">{data.programTitle}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Veriliş Tarihi</p>
                <p className="text-sm font-medium text-foreground">
                  {data.issuedAt &&
                    new Date(data.issuedAt).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <ShieldX className="mx-auto size-10 text-danger" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Geçersiz Sertifika</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Bu koda ait bir sertifika bulunamadı.
            </p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
