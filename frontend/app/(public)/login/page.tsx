import { PageHero } from "@/components/marketing/page-hero";
import { LoginForm } from "@/components/auth/login-form";
import { getSiteContent } from "@/lib/marketing/get-site-content";

export default async function LoginPage() {
  const siteContent = await getSiteContent();

  return (
    <>
      <PageHero title="Giriş Yap" heroImageSrc={siteContent.heroImageUrl ?? undefined} />
      <LoginForm />
    </>
  );
}
