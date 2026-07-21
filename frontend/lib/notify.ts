import { toast } from "sonner";

/**
 * ORCA platform genelinde TEK bildirim standardı.
 * Login, Dashboard, Admin, AI Mentor — her yerde bunu kullan,
 * doğrudan sonner'ı çağırma.
 */
export const notify = {
  success: (title: string, description?: string) =>
    toast.success(title, { description }),
  error: (title: string, description?: string) =>
    toast.error(title, { description }),
  info: (title: string, description?: string) =>
    toast.info(title, { description }),
  warning: (title: string, description?: string) =>
    toast.warning(title, { description }),
};

// Sık kullanılan platform olayları için hazır kısayollar
export const notifyEvents = {
  loginSuccess: (name: string) => notify.success("Başarıyla giriş yapıldı", `Hoş geldin ${name}.`),
  loginFailed: (reason: string) => notify.error("Giriş yapılamadı", reason),
  profileUpdated: () => notify.success("Profil güncellendi"),
  lessonCompleted: (title: string) => notify.success("Ders tamamlandı", title),
  badgeEarned: (name: string) => notify.success(`🏆 Rozet kazandın`, name),
  certificateReady: (program: string) => notify.success("🎓 Sertifikan hazır", program),
  aiAnalysisDone: () => notify.info("🤖 AI Analizi tamamlandı"),
  liveLessonSoon: (minutes: number) => notify.info(`📅 Canlı ders ${minutes} dakika sonra başlıyor`),
  paymentSuccess: () => notify.success("💳 Ödeme başarılı"),
  subscriptionExpiring: (days: number) => notify.warning(`Aboneliğin ${days} gün sonra bitecek`),
};
