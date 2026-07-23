"use client";
import { Dna, ShieldAlert, Brain, ThumbsUp, ThumbsDown, Target, Clock } from "lucide-react";
import { useMySimulationDnaReports } from "@/lib/hooks/use-simulation-dna";

export default function SimulationDnaPage() {
  const { data: reports, isLoading } = useMySimulationDnaReports();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F5F8FF]">Simülasyon DNA</h1>
        <p className="text-sm text-[#8D9BB6]">
          Her 5 simülasyon işleminden sonra Yapay Zeka Mentor, işlem tarzını analiz ederek burada bir rapor sunar.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>
        </div>
      ) : !reports || reports.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
          <Dna size={32} color="#8D9BB6" className="mx-auto" />
          <p className="text-sm text-[#8D9BB6]">
            Henüz bir DNA raporun yok. Simülasyonda 5 işlem tamamladığında ilk raporun burada görünecek.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dna size={18} color="#8A54FF" />
                  <h2 className="font-medium text-[#F5F8FF]">
                    İlk {report.tradesAnalyzedCount} İşlem Raporu
                  </h2>
                </div>
                <span className="text-xs text-[#8D9BB6]">
                  {new Date(report.createdAt).toLocaleDateString("tr-TR")}
                </span>
              </div>

              {report.pending ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card-inner p-4">
                  <Clock size={16} color="#F39C3D" />
                  <p className="text-sm text-[#8D9BB6]">
                    Yapay Zeka Mentor bu raporu hazırlıyor. Analiz yakında burada görünecek.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card-inner p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs text-[#8D9BB6]">
                        <ShieldAlert size={14} />
                        Risk Profili
                      </div>
                      <p className="text-sm font-medium text-[#F5F8FF]">{report.riskProfile}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card-inner p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs text-[#8D9BB6]">
                        <Brain size={14} />
                        Psikoloji
                      </div>
                      <p className="text-sm font-medium text-[#F5F8FF]">{report.psychologyLabel}</p>
                    </div>
                  </div>

                  {report.strengths && report.strengths.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-xs text-[#8D9BB6]">
                        <ThumbsUp size={14} color="#32D66B" />
                        Güçlü Yönler
                      </div>
                      <ul className="space-y-1">
                        {report.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-[#D7E1F8]">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.weaknesses && report.weaknesses.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-xs text-[#8D9BB6]">
                        <ThumbsDown size={14} color="#FF5C5C" />
                        Zayıf Yönler
                      </div>
                      <ul className="space-y-1">
                        {report.weaknesses.map((w, i) => (
                          <li key={i} className="text-sm text-[#D7E1F8]">• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.developmentPlan && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-xs text-[#8D9BB6]">
                        <Target size={14} color="#355CFF" />
                        Gelişim Planı
                      </div>
                      <p className="text-sm text-[#D7E1F8]">{report.developmentPlan}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
