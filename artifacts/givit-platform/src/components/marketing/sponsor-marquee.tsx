function MicrosoftForStartupsLogo({ className }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-center gap-2.5 rounded-full border border-border/40 bg-card px-4 py-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md ${className ?? ""}`}>
      <svg viewBox="0 0 21 21" className="h-5 w-5" aria-hidden="true">
        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
      </svg>
      <span className="whitespace-nowrap text-sm font-semibold">Microsoft for Startups</span>
    </div>
  );
}

function AwsActivateLogo({ className }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-center gap-2.5 rounded-full border border-border/40 bg-card px-4 py-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md ${className ?? ""}`}>
      <svg viewBox="0 0 60 34" className="h-6 w-11" aria-hidden="true">
        <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="22" fill="currentColor">aws</text>
        <path d="M2 27 Q30 38 58 27" stroke="#FF9900" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <span className="whitespace-nowrap text-sm font-semibold">AWS Activate</span>
    </div>
  );
}

const SPONSOR_LOGOS = [MicrosoftForStartupsLogo, AwsActivateLogo];

// Text color is set with literal light/dark classes rather than the
// text-foreground token: the marquee track animates via CSS transform
// continuously, and elements inside a continuously-transformed (and
// thus separately-composited) subtree don't reliably repaint their
// custom-property-derived color when the theme toggles, even though
// the same token resolves fine everywhere else on the page.
export function SponsorMarquee() {
  const track = [...SPONSOR_LOGOS, ...SPONSOR_LOGOS];
  return (
    <div className="relative overflow-hidden py-2 text-neutral-900 dark:text-neutral-50">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div className="animate-marquee flex w-max items-center gap-5">
        {track.map((Logo, i) => (
          <Logo key={i} />
        ))}
      </div>
    </div>
  );
}
