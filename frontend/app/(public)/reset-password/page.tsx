import { PageHero } from "@/components/marketing/page-hero";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getSiteContent } from "@/lib/marketing/get-site-content";

export default async function ResetPasswordPage() {
  const siteContent = await getSiteContent();

  return (
    <>
      <PageHero title="Şifremi Unuttum" heroImageSrc={siteContent.heroImageUrl ?? undefined} />
      <ResetPasswordForm />
    </>
  );
}
