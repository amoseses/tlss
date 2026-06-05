export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[&]/g, " and ")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
