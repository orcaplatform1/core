export function ShowcaseSection({
  eyebrow,
  title,
  left,
  right,
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      {(eyebrow || title) && (
        <div className="mb-10 space-y-2">
          {eyebrow && <p className="text-tag text-primary">{eyebrow}</p>}
          {title && <h2 className="text-h2 text-foreground">{title}</h2>}
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {left}
        {right}
      </div>
    </section>
  );
}
