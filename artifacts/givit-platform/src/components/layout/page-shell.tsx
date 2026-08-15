import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
  wide?: boolean;
};

export function PageShell({ children, className, narrow, wide }: Props) {
  return (
    <div
      className={cn(
        // Previously py-4 md:py-6 -- cramped enough that nearly every page
        // read as content packed edge-to-edge against its own header. This
        // one wrapper backs almost every functional page, so more breathing
        // room here alone lifts the whole site's density.
        "container w-full py-6 md:py-10",
        narrow && "max-w-xl",
        wide && "max-w-full",
        className,
      )}
    >
      {children}
    </div>
  );
}

type HeaderProps = {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  centered?: boolean;
};

export function PageHeader({
  title,
  description,
  children,
  centered = false,
}: HeaderProps) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 md:mb-5",
        centered
          ? "items-center text-center"
          : "md:flex-row md:items-end md:justify-between md:text-left",
      )}
    >
      <div>
        <h1 className="font-serif text-2xl font-bold text-givit-ink md:text-3xl">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function Breadcrumbs({ children }: { children: React.ReactNode }) {
  return (
    <nav className="text-muted-foreground mb-4 text-sm" aria-label="Breadcrumb">
      {children}
    </nav>
  );
}
