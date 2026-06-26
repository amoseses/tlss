export type ProductUrlDraft = {
  name: string;
  brand: string;
  price: string;
  description: string;
};

function titleCase(value: string) {
  return value
    .replace(/[-_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function inferProductFromUrl(url: string): ProductUrlDraft {
  try {
    const parsed = new URL(url);
    const hostParts = parsed.hostname.replace(/^www\./, "").split(".");
    const brand = titleCase(hostParts[0] ?? "");
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const candidate = pathParts.find((part) => /[a-zA-Z]/.test(part) && !/^(dp|gp|product|products|item|p)$/i.test(part));
    const name = titleCase(decodeURIComponent(candidate ?? `${brand} gift item`));

    return {
      name,
      brand,
      price: "",
      description: `AI draft imported from ${parsed.hostname}. Review product details, image, pricing, and gift metadata before approval.`,
    };
  } catch {
    return { name: "", brand: "", price: "", description: "" };
  }
}
