import { useSearch } from "wouter";

export function HeaderSearch() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const q = params.get("q") ?? "";

  return (
    <form action="/products" method="get" className="flex w-full items-stretch">
      <input
        type="search"
        name="q"
        key={q}
        defaultValue={q}
        placeholder="Search gifts, brands, interests..."
        className="min-w-0 flex-1 rounded-l-md border-0 bg-background px-4 py-2.5 text-sm text-givit-ink outline-none placeholder:text-muted-foreground"
        autoComplete="off"
      />
      <button
        type="submit"
        aria-label="Search"
        className="bg-givit-ember hover:bg-givit-ember-hover flex shrink-0 items-center justify-center rounded-r-md px-5 transition-colors"
      >
        <img
          src="/Screenshot 2026-06-23 095149.png"
          alt=""
          aria-hidden="true"
          className="h-6 w-6 rounded-md object-cover"
        />
      </button>
    </form>
  );
}
