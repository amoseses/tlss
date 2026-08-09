function MicrosoftForStartupsLogo({ className }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-center gap-2.5 rounded-full border border-border/60 bg-card px-4 py-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md ${className ?? ""}`}>
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

function GoogleForStartupsLogo({ className }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-center gap-2.5 rounded-full border border-border/60 bg-card px-4 py-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md ${className ?? ""}`}>
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
        <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
        <path fill="#FBBC05" d="M11.69 28.18A13.98 13.98 0 0 1 10.9 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
        <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
      </svg>
      <span className="whitespace-nowrap text-sm font-semibold">Google for Startups</span>
    </div>
  );
}

function AwsActivateLogo({ className }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-center gap-2.5 rounded-full border border-border/60 bg-card px-4 py-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md ${className ?? ""}`}>
      <svg viewBox="0 0 60 34" className="h-6 w-11" aria-hidden="true">
        <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="22" fill="currentColor">aws</text>
        <path d="M2 27 Q30 38 58 27" stroke="#FF9900" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <span className="whitespace-nowrap text-sm font-semibold">AWS Activate</span>
    </div>
  );
}

const SPONSOR_LOGOS = [MicrosoftForStartupsLogo, GoogleForStartupsLogo, AwsActivateLogo];

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
