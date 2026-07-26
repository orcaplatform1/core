import { cn } from "@/lib/utils";
import type { SiteContentSettings } from "@/lib/marketing/site-content-types";

export function SiteLogo({
  siteContent,
  textClassName = "text-foreground",
  imgClassName = "h-10",
  collapsed = false,
}: {
  siteContent: SiteContentSettings;
  textClassName?: string;
  imgClassName?: string;
  collapsed?: boolean;
}) {
  const [first, ...rest] = siteContent.headerLogoText.split(" ");

  if (collapsed) {
    return siteContent.headerLogoImageUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={siteContent.headerLogoImageUrl}
        alt={siteContent.headerLogoText}
        className={cn("w-auto object-contain", imgClassName)}
      />
    ) : null;
  }

  return (
    <span className="flex items-center gap-2.5">
      {siteContent.headerLogoImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={siteContent.headerLogoImageUrl}
          alt={siteContent.headerLogoText}
          className={cn("w-auto object-contain shrink-0", imgClassName)}
        />
      )}
      <span className={cn("font-bold tracking-tight whitespace-nowrap", textClassName)}>
        {first} {rest.length > 0 && <span className="text-primary">{rest.join(" ")}</span>}
      </span>
    </span>
  );
}
