import { TECH_STACK, TECH_STACK_CLOSING, TECH_STACK_INTRO, type TechStackItem } from "@/lib/marketing/tech-stack-data";

function TechIcon({ item }: { item: TechStackItem }) {
  const Icon = item.icon;
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card-inner">
      <Icon className="size-5" style={item.color ? { color: item.color } : undefined} />
      {item.secondaryIcon && (
        <item.secondaryIcon
          className="-ml-2 size-5"
          style={item.secondaryColor ? { color: item.secondaryColor } : undefined}
        />
      )}
    </span>
  );
}

export function TechStackGrid() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
      <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{TECH_STACK_INTRO}</p>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TECH_STACK.map((item) => (
          <div
            key={item.name}
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-colors duration-200 hover:border-primary/30"
          >
            <TechIcon item={item} />
            <div>
              <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{TECH_STACK_CLOSING.title}</h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">{TECH_STACK_CLOSING.description}</p>
      </div>
    </div>
  );
}
