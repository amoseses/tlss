"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

function HeaderSearchField() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  return (
    <form action="/products" method="get" className="flex min-w-0 flex-1 items-stretch">
      <input
        type="search"
        name="q"
        key={q}
        defaultValue={q}
        placeholder="Search the marketplace: pens, coffee, tech..."
        className="min-w-0 flex-1 rounded-l-full border-0 bg-white/10 px-5 py-2.5 text-sm text-white outline-none placeholder:text-white/50"
        autoComplete="off"
      />
      <button
        type="submit"
        aria-label="Search"
        className="bg-givit-ember hover:bg-givit-ember-hover flex shrink-0 items-center justify-center rounded-r-full px-5 transition-colors"
      >
        <Search className="h-5 w-5 text-white" strokeWidth={2.5} />
      </button>
    </form>
  );
}

export function HeaderSearch() {
  return (
    <Suspense
      fallback={
        <form action="/products" method="get" className="flex min-w-0 flex-1 items-stretch">
          <input
            type="search"
            name="q"
            placeholder="Search the marketplace: pens, coffee, tech..."
            className="min-w-0 flex-1 rounded-l-full border-0 bg-white/10 px-5 py-2.5 text-sm text-white outline-none placeholder:text-white/50"
            autoComplete="off"
          />
          <button
            type="submit"
            aria-label="Search"
            className="bg-givit-ember hover:bg-givit-ember-hover flex shrink-0 items-center justify-center rounded-r-full px-5 transition-colors"
          >
            <Search className="h-5 w-5 text-white" strokeWidth={2.5} />
          </button>
        </form>
      }
    >
      <HeaderSearchField />
    </Suspense>
  );
}
