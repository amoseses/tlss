import { useSearch } from "wouter";

export function useSearchParams() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  return {
    get: (key: string) => params.get(key) ?? "",
    params,
  };
}
