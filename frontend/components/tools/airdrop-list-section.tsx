"use client";

import { useState } from "react";
import { Gift, ChevronLeft, ChevronRight } from "lucide-react";
import { useAirdrops, type AirdropQuery, type AirdropStatus, type AirdropDifficulty } from "@/lib/hooks/use-airdrops";
import { AirdropCard } from "./airdrop-card";
import { SponsorCtaButton } from "@/components/ui/sponsor-cta-button";

function selectClass() {
  return "rounded-xl border border-border bg-card-inner px-3 py-1.5 text-body-sm text-foreground/90 outline-none focus:border-primary";
}

export function AirdropListSection() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AirdropStatus | "">("");
  const [difficulty, setDifficulty] = useState<AirdropDifficulty | "">("");
  const [blockchain, setBlockchain] = useState("");
  const [requiresKYC, setRequiresKYC] = useState<boolean | undefined>(undefined);
  const [requiresWallet, setRequiresWallet] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(1);

  const query: AirdropQuery = {
    page,
    limit: 20,
    q: q || undefined,
    status: status || undefined,
    difficulty: difficulty || undefined,
    blockchain: blockchain || undefined,
    requiresKYC,
    requiresWallet,
  };

  const { data, isLoading } = useAirdrops(query);
  const airdrops = data?.data ?? [];
  const pagination = data?.pagination;

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SponsorCtaButton label="Airdrop Ekle" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${selectClass()} min-w-[200px] flex-1`}
          placeholder="Proje, başlık veya zincir ara..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            resetPage();
          }}
        />
        <select
          className={selectClass()}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as AirdropStatus | "");
            resetPage();
          }}
        >
          <option value="">Tüm Durumlar</option>
          <option value="UPCOMING">Yakında</option>
          <option value="ACTIVE">Aktif</option>
          <option value="ENDED">Sona Erdi</option>
        </select>
        <select
          className={selectClass()}
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value as AirdropDifficulty | "");
            resetPage();
          }}
        >
          <option value="">Tüm Zorluklar</option>
          <option value="EASY">Kolay</option>
          <option value="MEDIUM">Orta</option>
          <option value="HARD">Zor</option>
        </select>
        <input
          className={`${selectClass()} w-[140px]`}
          placeholder="Zincir (ör. Solana)"
          value={blockchain}
          onChange={(e) => {
            setBlockchain(e.target.value);
            resetPage();
          }}
        />
        <label className="flex items-center gap-1.5 text-body-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={requiresKYC === false}
            onChange={(e) => {
              setRequiresKYC(e.target.checked ? false : undefined);
              resetPage();
            }}
          />
          KYC gerektirmez
        </label>
        <label className="flex items-center gap-1.5 text-body-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={requiresWallet === true}
            onChange={(e) => {
              setRequiresWallet(e.target.checked ? true : undefined);
              resetPage();
            }}
          />
          Cüzdan gerekli
        </label>
      </div>

      {isLoading ? (
        <p className="text-body-sm text-muted-foreground">Yükleniyor...</p>
      ) : airdrops.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <Gift className="size-5" />
          </span>
          <h3 className="text-card-title-sm text-foreground">Sonuç bulunamadı</h3>
          <p className="mx-auto mt-1 max-w-sm text-body-xs text-muted-foreground">
            Filtreleri değiştirip tekrar dene ya da yeni airdroplar eklenene kadar bekle.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {airdrops.map((a) => (
            <AirdropCard key={a.id} airdrop={a} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-body-sm text-foreground/80 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" /> Önceki
          </button>
          <span className="text-body-xs text-muted-foreground">
            Sayfa {pagination.page} / {pagination.totalPages}
          </span>
          <button
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-body-sm text-foreground/80 disabled:opacity-40"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sonraki <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
