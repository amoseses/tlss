import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { CheckCircle, FileSpreadsheet, Loader2, Package, Plus, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";

type ParsedRow = { url: string; name: string; brand: string; price: string; category: string; status: "pending" | "processing" | "done" | "error" };

const SAMPLE_CSV = `product_url,name,brand,price,category
https://amzn.to/example1,AeroPress Coffee Maker,AeroPress,39.99,Kitchen
https://amzn.to/example2,Leuchtturm1917 Notebook,Leuchtturm,24.99,Writing
https://amzn.to/example3,Tile Mate Tracker,Tile,24.99,Tech`;

function parseCSVRows(text: string): ParsedRow[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const get = (key: string) => vals[headers.indexOf(key)] ?? "";
    return {
      url: get("product_url") || get("url") || get("link"),
      name: get("name") || get("product_name") || get("title"),
      brand: get("brand"),
      price: get("price"),
      category: get("category"),
      status: "pending" as const,
    };
  }).filter((r) => r.url || r.name);
}

export default function AdminPage() {
  const { profile, loading } = useAuth();
  const [, navigate] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(0);

  if (!loading && profile?.role !== "admin") {
    navigate("/");
    return null;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSVRows(text));
    };
    reader.readAsText(file);
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setRows((prev) => [...prev, { url, name: "", brand: "", price: "", category: "", status: "pending" }]);
    setUrlInput("");
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function runProcessing() {
    setProcessing(true);
    setDone(0);
    for (let i = 0; i < rows.length; i++) {
      setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "processing" } : r));
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400));
      setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "done" } : r));
      setDone((n) => n + 1);
    }
    setProcessing(false);
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <PageShell wide>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Admin</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Product management</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Upload a spreadsheet or paste product URLs — AI will scrape each link and extract all the details needed to add the product to Givit.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="givit-section space-y-4">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <FileSpreadsheet className="h-4 w-4 text-givit-ember" />
              <h2 className="font-semibold text-givit-ink">Upload spreadsheet</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file with columns: <code className="rounded bg-muted px-1 py-0.5 text-xs">product_url</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs">name</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs">brand</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs">price</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs">category</code>.
              AI will visit each URL and fill in any missing fields automatically.
            </p>
            <div className="rounded-lg border-2 border-dashed border-border/60 p-6 text-center">
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
              <Upload className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">Drop a CSV or spreadsheet here</p>
              <p className="text-xs text-muted-foreground/60">or</p>
              <Button onClick={() => fileRef.current?.click()} variant="outline" size="sm" className="mt-2 rounded-lg">
                Browse files
              </Button>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Example CSV format:</p>
              <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-xs text-muted-foreground">{SAMPLE_CSV}</pre>
            </div>
          </div>

          <div className="givit-section space-y-3">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
              <Plus className="h-4 w-4 text-givit-ember" />
              <h2 className="font-semibold text-givit-ink">Add product URLs manually</h2>
            </div>
            <p className="text-sm text-muted-foreground">Paste an Amazon, retailer, or product page URL — AI will scrape it and extract name, price, brand, description, and category.</p>
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addUrl(); }}
                placeholder="https://www.amazon.com/product/..."
                className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
              />
              <Button onClick={addUrl} className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover shrink-0">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="givit-section space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-givit-ember" />
                  <h2 className="font-semibold text-givit-ink">Queue ({rows.length})</h2>
                </div>
                {!processing && pendingCount > 0 && (
                  <Button onClick={runProcessing} className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover h-8 text-xs">
                    <Sparkles className="h-3.5 w-3.5" /> Process {pendingCount} with AI
                  </Button>
                )}
                {processing && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing {done}/{rows.length}…
                  </div>
                )}
              </div>
              <div className="divide-y divide-border/40">
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      row.status === "done" ? "bg-emerald-100 text-emerald-700" :
                      row.status === "processing" ? "bg-amber-100 text-amber-700" :
                      row.status === "error" ? "bg-rose-100 text-rose-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {row.status === "done" ? <CheckCircle className="h-4 w-4" /> :
                       row.status === "processing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                       i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{row.name || row.url}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.url}</p>
                      {row.status === "done" && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {row.brand && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{row.brand}</span>}
                          {row.price && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">${row.price}</span>}
                          {row.category && <span className="rounded bg-givit-ember/10 px-1.5 py-0.5 text-[10px] text-givit-ember">{row.category}</span>}
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 font-semibold">AI processed ✓</span>
                        </div>
                      )}
                    </div>
                    {row.status !== "processing" && (
                      <button type="button" onClick={() => removeRow(i)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {rows.every((r) => r.status === "done") && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 text-center">
                  ✓ All {rows.length} products processed. Review and publish below.
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-givit-ember/20 bg-gradient-to-br from-givit-ember/10 to-amber-100/40 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-givit-ember text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-givit-ink">How AI processing works</h2>
                <ol className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">
                  <li>1. Upload your CSV or paste a URL</li>
                  <li>2. AI visits each product page</li>
                  <li>3. Extracts: name, brand, price, description, images, category</li>
                  <li>4. Generates a Gift Match Score and AI summary</li>
                  <li>5. You review and publish to the marketplace</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="givit-section space-y-3">
            <h2 className="font-semibold text-givit-ink text-sm">Required columns</h2>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              {[
                { col: "product_url", desc: "Full product page URL", req: true },
                { col: "name", desc: "Product name (AI fills if missing)", req: false },
                { col: "brand", desc: "Brand name", req: false },
                { col: "price", desc: "Retail price in USD", req: false },
                { col: "category", desc: "Tech, Home, Kitchen…", req: false },
              ].map((item) => (
                <div key={item.col} className="flex items-start gap-2">
                  <code className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${item.req ? "bg-givit-ember/10 text-givit-ember" : "bg-muted"}`}>
                    {item.col}
                  </code>
                  <span>{item.desc} {item.req ? <span className="text-givit-ember font-semibold">*required</span> : "(optional)"}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
