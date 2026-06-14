import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronDown, ArrowRight, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GUIDE, GUIDE_FEATURE_COUNT, type GuideFeature, type GuideSection } from "@/features/help/guide-data";

function featureText(f: GuideFeature) {
  return [f.title, f.where, f.tip ?? "", ...f.steps].join(" ").toLowerCase();
}

export function HelpPage() {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>("all");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Build the visible sections + their (possibly filtered) features.
  const visible = useMemo(() => {
    return GUIDE.map((section) => {
      const features = searching
        ? section.features.filter(
            (f) =>
              featureText(f).includes(q) ||
              section.title.toLowerCase().includes(q) ||
              section.summary.toLowerCase().includes(q),
          )
        : section.features;
      return { section, features };
    }).filter(({ section, features }) => {
      if (searching) return features.length > 0;
      return activeSection === "all" || activeSection === section.id;
    });
  }, [q, searching, activeSection]);

  const matchCount = searching
    ? visible.reduce((n, v) => n + v.features.length, 0)
    : GUIDE_FEATURE_COUNT;

  const selectSection = (id: string) => {
    setActiveSection(id);
    setQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 p-6 text-primary-foreground shadow-glow-lg ring-1 ring-inset ring-white/15 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_85%_-10%,rgba(255,255,255,0.35),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 animate-float rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/20">
            <Sparkles className="h-3.5 w-3.5" /> Interactive guide
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">How to use FinTrack</h1>
          <p className="mt-1 max-w-2xl text-sm text-primary-foreground/80">
            A complete walkthrough of every feature — what it does, how to use it, and exactly where
            to find it. {GUIDE_FEATURE_COUNT} features across {GUIDE.length} areas.
          </p>

          {/* Search */}
          <div className="relative mt-5 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/70" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search features… (e.g. “EMI”, “budget”, “export”, “transfer”)"
              aria-label="Search features"
              className="h-11 border-white/25 bg-white/15 pl-9 pr-9 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-white/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-primary-foreground/70 transition-colors hover:bg-white/20 hover:text-primary-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Category filter pills (hidden while searching) */}
      {!searching && (
        <div className="flex flex-wrap gap-2">
          <Pill active={activeSection === "all"} onClick={() => selectSection("all")}>
            All areas
          </Pill>
          {GUIDE.map((s) => (
            <Pill key={s.id} active={activeSection === s.id} onClick={() => selectSection(s.id)}>
              <s.icon className="h-3.5 w-3.5" />
              {s.title}
            </Pill>
          ))}
        </div>
      )}

      {searching && (
        <p className="text-sm text-muted-foreground">
          {matchCount} {matchCount === 1 ? "result" : "results"} for “{query}”
        </p>
      )}

      {/* Sections */}
      <div className="space-y-5">
        {visible.map(({ section, features }) => (
          <SectionCard
            key={section.id}
            section={section}
            features={features}
            open={open}
            searching={searching}
            onToggle={toggle}
          />
        ))}

        {visible.length === 0 && (
          <div className="rounded-2xl border border-dashed py-16 text-center">
            <p className="text-sm font-medium">No features match “{query}”.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different word, or browse the areas below.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setQuery("")}>
              Clear search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-glow ring-1 ring-inset ring-white/15"
          : "glass text-foreground hover:-translate-y-0.5",
      )}
    >
      {children}
    </button>
  );
}

function SectionCard({
  section,
  features,
  open,
  searching,
  onToggle,
}: {
  section: GuideSection;
  features: GuideFeature[];
  open: Set<string>;
  searching: boolean;
  onToggle: (key: string) => void;
}) {
  const Icon = section.icon;
  return (
    <section className="glass overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-content-center rounded-xl bg-gradient-to-b from-primary/85 to-primary text-primary-foreground shadow-glow ring-1 ring-inset ring-white/20">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight">{section.title}</h2>
            <p className="text-sm text-muted-foreground">{section.summary}</p>
            <p className="mt-1 text-xs text-muted-foreground/80">📍 {section.location}</p>
          </div>
        </div>
        {section.to && (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to={section.to}>
              Open <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>

      <div className="divide-y divide-border/60">
        {features.map((f) => {
          const key = `${section.id}::${f.title}`;
          const isOpen = searching || open.has(key);
          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => onToggle(key)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent/50"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="font-medium">{f.title}</span>
                  <span className="inline-flex w-fit items-center rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                    {f.where}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {isOpen && (
                <div className="animate-fade-up px-5 pb-4 pl-5 sm:pl-[4.25rem]">
                  <ol className="space-y-2">
                    {f.steps.map((step, si) => (
                      <li key={si} className="flex gap-3 text-sm text-muted-foreground">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-content-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                          {si + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                  {f.tip && (
                    <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground/80">
                      <span className="font-semibold text-primary">Tip · </span>
                      {f.tip}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
