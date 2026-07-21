"use client";

import { Award, Download, ShieldCheck, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  useMyCertificateStatus,
  useIssueCertificate,
} from "@/lib/hooks/use-curriculum";
import { authStorage } from "@/lib/auth-storage";
import { Button } from "@/components/ui/button";

export default function CertificatesPage() {
  const { data: status, isLoading } = useMyCertificateStatus();
  const { mutate: issueCertificate, isPending } = useIssueCertificate();

  const handleDownload = async (id: string) => {
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/certificates/${id}/pdf`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orca-sertifika.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Sertifika indirilemedi, tekrar dene.");
    }
  };

  const handleIssue = () => {
    issueCertificate(undefined, {
      onSuccess: () => toast.success("🎓 Sertifikan hazır!"),
      onError: () => toast.error("Sertifika verilemedi, tekrar dene."),
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sertifikam</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ORCA TRADERS eğitim programının tamamını bitirince kazanacağın mezuniyet sertifikası.
        </p>
      </div>

      {isLoading || !status ? (
        <div className="h-64 animate-pulse rounded-2xl bg-card" />
      ) : status.hasCertificate ? (
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card p-10 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/25 via-card to-purple/15">
            <Award className="size-10 text-primary drop-shadow-[0_0_20px_rgba(79,107,255,0.5)]" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{status.certificate.code}</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              ORCA TRADERS Mezuniyet Sertifikası
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(status.certificate.issuedAt).toLocaleDateString("tr-TR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}{" "}
              tarihinde verildi
            </p>
          </div>
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              className="h-11 flex-1"
              onClick={() => handleDownload(status.certificate.id)}
            >
              <Download className="size-4" /> PDF İndir
            </Button>
            <Button
              className="h-11 flex-1"
              render={
                <a href={`/verify/${status.certificate.code}`} target="_blank" rel="noopener noreferrer">
                  <ShieldCheck className="size-4" /> Doğrula
                </a>
              }
            />
          </div>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-10 text-center">
          {status.eligible ? (
            <>
              <Sparkles className="size-10 text-purple" />
              <h2 className="text-lg font-semibold text-foreground">
                Tebrikler, tüm eğitimi tamamladın!
              </h2>
              <p className="text-sm text-muted-foreground">
                Mezuniyet sertifikanı almak için son adım seni bekliyor.
              </p>
              <Button className="h-11 w-full" disabled={isPending} onClick={handleIssue}>
                {isPending ? "Oluşturuluyor..." : "Sertifikamı Al"}
              </Button>
            </>
          ) : (
            <>
              <Lock className="size-10 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Henüz hazır değil</h2>
              <p className="text-sm text-muted-foreground">
                {status.totalPrograms === 0
                  ? "Sertifika kazanmak için önce bir programa sahip olmalısın."
                  : `${status.completedPrograms}/${status.totalPrograms} program tamamlandı — sertifika için sahip olduğun tüm programları bitirmen gerekiyor.`}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
