import Link from "next/link";

const footerColumns = [
  {
    title: "Platform",
    links: [
      { label: "Programlar", href: "/programs" },
      { label: "Eğitmenler", href: "/instructors" },
      { label: "Blog", href: "/blog" },
      { label: "SSS", href: "/faq" },
    ],
  },
  {
    title: "Kurumsal",
    links: [
      { label: "Hakkımızda", href: "/about" },
      { label: "İletişim", href: "/contact" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { label: "Gizlilik Politikası", href: "/privacy-policy" },
      { label: "KVKK", href: "/kvkk" },
      { label: "Kullanım Şartları", href: "/terms-of-service" },
      { label: "Mesafeli Satış Sözleşmesi", href: "/distance-sales-agreement" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <span className="text-lg font-bold text-foreground">
              ORCA <span className="text-primary">TRADERS</span>
            </span>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              Yapay zeka destekli finans ve trading eğitim platformu.
            </p>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground mb-4">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-divider text-xs text-muted-foreground">
          © {new Date().getFullYear()} ORCA TRADERS. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
