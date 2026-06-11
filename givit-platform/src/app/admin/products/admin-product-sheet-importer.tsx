"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { importProductsFromSheetAction } from "@/app/actions/admin-products";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ImportResult = Awaited<ReturnType<typeof importProductsFromSheetAction>>;

export function AdminProductSheetImporter() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setResult(null);

    startTransition(async () => {
      try {
        const response = await importProductsFromSheetAction({
          sheet_url: String(formData.get("sheet_url") || ""),
          csv_text: String(formData.get("csv_text") || ""),
          default_published: formData.get("default_published") === "on",
        });
        setResult(response);
        toast.success(`Imported ${response.created} products`);
        formRef.current?.reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Bulk import from Google Sheets</h2>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
            Paste a shared Google Sheet URL or CSV. Include columns such as <code>product_link</code>, <code>image_link</code>, <code>name</code>, <code>price</code>, <code>category</code>, and tag columns. Givit will scrape missing title, description, price, and image metadata from each product link.
          </p>
        </div>
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="sheet_url">Google Sheet URL</Label>
          <Input
            id="sheet_url"
            name="sheet_url"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=0"
          />
          <p className="text-muted-foreground text-xs">
            The sheet must be accessible to anyone with the link or published. Givit converts it to a CSV export automatically.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="csv_text">Or paste CSV rows</Label>
          <Textarea
            id="csv_text"
            name="csv_text"
            rows={5}
            placeholder={'product_link,image_link,name,price,category,gift_tags\nhttps://example.com/item,https://example.com/item.jpg,Gift Item,49.99,kitchen,"coffee, hosting"'}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="default_published" name="default_published" />
          <Label htmlFor="default_published" className="font-normal">
            Publish imported products immediately
          </Label>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Importing and scraping…" : "Import products"}
        </Button>
      </form>

      {result ? (
        <div className="mt-4 rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">
            Created {result.created} product{result.created === 1 ? "" : "s"}; skipped {result.skipped} duplicate link{result.skipped === 1 ? "" : "s"}.
          </p>
          {result.errors.length > 0 ? (
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5">
              {result.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
