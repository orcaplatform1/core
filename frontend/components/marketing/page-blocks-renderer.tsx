import type { PageBlock, HeadingSize, TextSize } from "@/lib/marketing/page-blocks-types";

const HEADING_CLASSES: Record<HeadingSize, string> = {
  sm: "text-h6 text-foreground mt-6",
  md: "text-h5 text-foreground mt-6",
  lg: "text-h4 text-foreground mt-6",
  xl: "text-h2 text-foreground mt-6",
};

const HEADING_TAGS: Record<HeadingSize, "h2" | "h3"> = {
  sm: "h3",
  md: "h3",
  lg: "h2",
  xl: "h2",
};

const TEXT_SIZE_CLASSES: Record<TextSize, string> = {
  sm: "text-body-sm",
  base: "text-body",
  lg: "text-body-lg",
};

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

export function PageBlocksRenderer({ blocks }: { blocks: PageBlock[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading": {
            const Tag = HEADING_TAGS[block.size];
            return (
              <Tag key={i} className={HEADING_CLASSES[block.size]}>
                {block.text}
              </Tag>
            );
          }
          case "paragraph": {
            const sizeClass = TEXT_SIZE_CLASSES[block.fontSize ?? "base"];
            return (
              <p
                key={i}
                className={`text-muted-foreground leading-relaxed ${sizeClass}`}
                style={block.color ? { color: block.color } : undefined}
              >
                {renderInlineMarkdown(block.text)}
              </p>
            );
          }
          case "bulletList":
            return (
              <ul key={i} className="list-disc space-y-1 pl-6 text-muted-foreground">
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            );
          case "image":
            return (
              <figure key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.url}
                  alt={block.alt ?? ""}
                  className="rounded-xl border border-border w-full"
                />
                {block.caption && (
                  <figcaption className="mt-2 text-center text-body-xs text-muted-foreground">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          case "divider":
            return <hr key={i} className="border-border my-6" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
