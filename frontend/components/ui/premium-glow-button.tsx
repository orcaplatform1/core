import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * ORCA'nın 4 özel CTA'sı için (Kayıt Ol, Satın Al/Eğitime Başla, Dashboard,
 * Ücretsiz İlk Dersi İzle) sürekli dönen mavi/mor gradient çerçeveli pill buton.
 * Diğer standart butonlar (Kaydet/Devam Et/Gönder/İptal vb.) sade Button'ı kullanmaya
 * devam eder — bu component sadece bu 4 alan için import edilmelidir.
 */
function PremiumGlowButton({
  className,
  wrapperClassName,
  variant = "secondary",
  ...props
}: React.ComponentProps<typeof Button> & { wrapperClassName?: string }) {
  return (
    <span className={cn("premium-glow-ring btn-premium-glow", wrapperClassName)}>
      <Button variant={variant} className={cn("rounded-full", className)} {...props} />
    </span>
  )
}

export { PremiumGlowButton }
