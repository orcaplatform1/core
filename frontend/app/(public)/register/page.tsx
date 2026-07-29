import { Suspense } from "react";
import { PageHero } from "@/components/marketing/page-hero";
import { RegisterForm } from "@/components/auth/register-form";
import { getSiteContent } from "@/lib/marketing/get-site-content";

export default async function RegisterPage() {
  const siteContent = await getSiteContent();

  return (
    <>
      <PageHero title="Kayıt Ol" heroImageSrc={siteContent.heroImageUrl ?? undefined} />
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </>
  );
}
