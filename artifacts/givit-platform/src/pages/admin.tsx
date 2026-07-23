import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  CheckCircle, FileSpreadsheet, Loader2, Package, Plus, Sparkles, Upload, X, 
  BarChart3, Users, ShoppingBag, TrendingUp, Eye, Edit3, Save, Trash2, 
  Search, Filter, CheckSquare, AlertTriangle, DollarSign, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";
import { extractProductWithAI } from "@/lib/admin/imported-products";
import { getAnalytics, getProductSubmissions, updateProductSubmission, getProducts, upsertProduct, deleteProduct, getAllProfiles, getOrders, trackEvent, getAllAutoGiftOrdersFromDb, updateAutoGiftOrderStatusInDb } from "@/lib/supabase/db";
import { getAutoGiftOrders } from "@/lib/autogift/survey";
import { getLocalErrors, getLocalEvents } from "@/lib/monitoring";

type ParsedRow = { url: string; name: string; brand: string; price: string; category: string; status: "pending" | "processing" | "done" | "error" };

const SAMPLE_CSV = `product_url
https://amzn.to/example1
https://amzn.to/example2
https://amzn.to/example3`;

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

type Tab = "products" | "rankings" | "import" | "analytics" | "submissions" | "orders" | "users";

export default function AdminPage() {
  const { profile, loading, user, refresh } = useAuth();
  const [, navigate] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [autoGiftOrders, setAutoGiftOrders] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [monitoringErrors, setMonitoringErrors] = useState<any[]>([]);
  const [localEvents, setLocalEvents] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // The auth profile is cached from login; re-fetch on mount so a role
    // change made directly in Supabase (without re-logging in) takes effect
    // immediately instead of showing a stale "not admin" redirect.
    refresh();
  }, []);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "admin")) {
      navigate("/");
    }
  }, [loading, user, profile, navigate]);

  useEffect(() => {
    if (profile?.role !== "admin") return;
    loadData();
  }, [activeTab, profile]);

  async function loadData() {
    try {
      if (activeTab === "analytics") {
        const data = await getAnalytics();
        setAnalyticsData(data);
        setMonitoringErrors(getLocalErrors());
        setLocalEvents(getLocalEvents());
      } else if (activeTab === "submissions") {
        const data = await getProductSubmissions();
        setSubmissions(data);
      } else if (activeTab === "products" || activeTab === "rankings") {
        const data = await getProducts();
        setAllProducts(data);
      } else if (activeTab === "orders") {
        const data = await getOrders({ limit: 50 });
        setAllOrders(data);

        // AutoGift orders live in Supabase (autogift_orders) once a customer
        // places one while logged in, so admin sees them regardless of
        // browser/device. Fall back to this browser's localStorage copies
        // too (e.g. orders placed while testing without an account) and
        // dedupe by id, preferring the DB version when both exist.
        const dbOrders = (await getAllAutoGiftOrdersFromDb()).map((o: any) => ({
          id: o.id,
          recipientName: o.recipient_name,
          occasion: o.occasion,
          items: o.items ?? [],
          subtotal: o.subtotal_cents,
          serviceFee: o.service_fee_cents,
          total: o.total_cents,
          status: o.status,
          chargeNote: o.charge_note,
          shippingAddress: o.shipping_address,
          cardMessage: o.card_message,
          customerNotes: o.customer_notes,
          adminNotes: o.admin_notes,
          createdAt: o.created_at,
        }));
        const localOrders = getAutoGiftOrders();
        const merged = new Map([...localOrders, ...dbOrders].map((o: any) => [o.id, o]));
        setAutoGiftOrders(Array.from(merged.values()));
      } else if (activeTab === "users") {
        const data = await getAllProfiles();
        setAllProfiles(data);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    }
  }

  if (loading) return <PageShell><div className="flex min-h-[400px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" /></div></PageShell>;
  if (profile?.role !== "admin") return null;

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
    // Sequential, not Promise.all: each row hits Groq + Microlink, and
    // firing dozens at once would just rate-limit the whole batch.
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      if (row.status === "done") continue;
      setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "processing" } : r));
      try {
        const extracted = await extractProductWithAI(row.url, row);
        const priceCents = Math.round(Number.parseFloat(extracted.price.replace(/[^0-9.]/g, "")) * 100) || 4999;
        // Saved straight to the real products table (not localStorage) so
        // imports are backend-persisted and visible from any device/admin —
        // admin is the approver here, so no separate review step needed.
        const { error: saveError } = await upsertProduct({
          name: extracted.name,
          slug: slugSafe(`${extracted.name}-${Date.now().toString(36)}-${i}`),
          description: extracted.description || `Admin-imported ${extracted.category} gift sourced from ${extracted.brand}.`,
          price_cents: priceCents,
          stock: 50,
          is_published: true,
          is_approved: true,
          affiliate_url: extracted.url,
          retailer: extracted.brand,
          brand: extracted.brand,
          gift_match_score: extracted.giftMatchScore,
          interests: [extracted.category, "giftable", "curated"],
          occasions: ["birthday", "holiday"],
          recipients: ["friend", "family"],
          ai_summary: extracted.description || `Admin-imported ${extracted.category} gift.`,
          why_we_picked_it: "Added via admin link import, curated for the GIVIT marketplace.",
          images: extracted.imageUrl ? [{ storage_path: extracted.imageUrl, sort_order: 0 }] : [],
          metadata: { category: extracted.category, source: "admin_bulk_import", importedAt: new Date().toISOString() },
        });
        // Supabase reports failures via { error }, not a thrown exception —
        // without this check a blocked RLS insert would still mark "done".
        if (saveError) throw saveError;
        setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, ...extracted, status: "done" as const } : r));
        setDone((n) => n + 1);
      } catch (err) {
        console.error("Failed to save imported product:", err);
        setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "error" } : r));
      }
    }
    setProcessing(false);
    loadData();
  }

  async function handleApproveSubmission(id: string) {
    const submission = submissions.find((item) => item.id === id);
    if (submission) {
      await upsertProduct({
        name: submission.name || "Approved customer gift",
        slug: slugSafe(`${submission.name || "customer-gift"}-${submission.id.slice(0, 8)}`),
        description: submission.description || submission.scraped_metadata?.aiSummary || "Customer-submitted product approved by admin.",
        price_cents: submission.price_cents || 4999,
        stock: 25,
        is_published: true,
        is_approved: true,
        submitted_by: submission.user_id || null,
        affiliate_url: submission.url,
        retailer: submission.brand || "Customer submitted",
        brand: submission.brand || null,
        gift_match_score: 82,
        interests: [submission.category || "giftable"],
        occasions: ["birthday", "holiday"],
        recipients: ["friend", "family"],
        ai_summary: submission.scraped_metadata?.aiSummary || `AI scraped ${submission.url} and prepared it for the marketplace.`,
        why_we_picked_it: "Approved from a customer link submission after AI scraping and admin review.",
        images: submission.image_url ? [{ storage_path: submission.image_url, sort_order: 0 }] : [],
        metadata: { sourceSubmissionId: submission.id, scraped: submission.scraped_metadata || {} },
      });
    }
    await updateProductSubmission(id, { status: "approved", reviewed_by: user?.id });
    loadData();
  }

  async function handleRejectSubmission(id: string) {
    await updateProductSubmission(id, { status: "rejected", reviewed_by: user?.id });
    loadData();
  }

  async function handleSaveProduct() {
    if (!editingProduct) return;
    // is_approved defaults to false in the schema (real seller submissions
    // need review) — but there's no separate approval step for products an
    // admin edits directly here, so without this a product could show
    // "Published" in this table yet never actually appear on the live
    // marketplace, which reads as the admin panel and Supabase being out
    // of sync when really it's just a stuck is_approved flag.
    const { error } = await upsertProduct({ ...editingProduct, is_approved: true });
    if (error) {
      console.error("Failed to save product:", error);
      alert("Couldn't save that product. Check the console for details.");
      return;
    }
    setShowEditModal(false);
    setEditingProduct(null);
    loadData();
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    await deleteProduct(id);
    loadData();
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const filteredProducts = allProducts.filter((p: any) => 
    !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "products", label: "Products", icon: Package },
    { id: "rankings", label: "Rankings", icon: TrendingUp },
    { id: "import", label: "Import", icon: Upload },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "submissions", label: "Submissions", icon: AlertTriangle },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "users", label: "Users", icon: Users },
  ];

  return (
    <PageShell wide>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Admin</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Dashboard</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              activeTab === tab.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
              />
            </div>
            <Button onClick={() => { setEditingProduct({ name: "", slug: "", price_cents: 0, description: "", is_published: false }); setShowEditModal(true); }} className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Price</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Rank</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredProducts.map((product: any) => (
                  <tr key={product.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">${(product.price_cents / 100).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.is_published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {product.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.gift_match_score ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">#{product.rank ?? product.category_rank ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => { setEditingProduct(product); setShowEditModal(true); }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-givit-ember"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* RANKINGS TAB */}
      {activeTab === "rankings" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-givit-ember/20 bg-givit-ember/5 p-4 text-sm text-muted-foreground">
            Admins can tune every product ranking signal shown across GIVIT. Changes save to the product row so marketplace sorting, category placement, and AI gift matching can use the updated values.
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Global rank</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Category rank</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Gift score</th>
                  <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredProducts.map((product: any, index: number) => (
                  <tr key={product.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3"><p className="font-medium text-foreground">{product.name}</p><p className="text-xs text-muted-foreground">{product.slug}</p></td>
                    <td className="px-4 py-3"><input type="number" value={product.rank ?? index + 1} onChange={(e) => setAllProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, rank: Number(e.target.value) } : p))} className="h-9 w-24 rounded-md border border-border bg-background px-2" /></td>
                    <td className="px-4 py-3"><input type="number" value={product.category_rank ?? index + 1} onChange={(e) => setAllProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, category_rank: Number(e.target.value) } : p))} className="h-9 w-24 rounded-md border border-border bg-background px-2" /></td>
                    <td className="px-4 py-3"><input type="number" min={0} max={100} value={product.gift_match_score ?? 80} onChange={(e) => setAllProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, gift_match_score: Number(e.target.value) } : p))} className="h-9 w-24 rounded-md border border-border bg-background px-2" /></td>
                    <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" className="rounded-lg" onClick={async () => { await upsertProduct(product); loadData(); }}><Save className="h-3.5 w-3.5" /> Save</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* IMPORT TAB */}
      {activeTab === "import" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="givit-section space-y-4">
              <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                <FileSpreadsheet className="h-4 w-4 text-givit-ember" />
                <h2 className="font-semibold text-givit-ink">Upload spreadsheet</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                A <code className="rounded bg-muted px-1 py-0.5 text-xs">product_url</code> column is all you need: GIVIT AI reads each page and fills in name, brand, category, and price. Add <code className="rounded bg-muted px-1 py-0.5 text-xs">name</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs">brand</code>, <code className="rounded bg-muted px-1 py-0.5 text-xs">price</code>, or <code className="rounded bg-muted px-1 py-0.5 text-xs">category</code> columns to override the AI for specific rows.
              </p>
              <div className="rounded-lg border-2 border-dashed border-border/60 p-6 text-center">
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
                <Upload className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium text-muted-foreground">Drop a CSV or spreadsheet here</p>
                <p className="text-xs text-muted-foreground/60">or</p>
                <Button onClick={() => fileRef.current?.click()} variant="outline" size="sm" className="mt-2 rounded-md">
                  Choose file
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
              <p className="text-sm text-muted-foreground">Paste a product page URL, and AI will scrape it and extract details.</p>
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
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-givit-ember/20 bg-gradient-to-br from-givit-ember/15 to-givit-coral/10 p-5">
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
          </aside>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {analyticsData ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="givit-panel p-4">
                  <div className="flex items-center gap-2 text-givit-ember">
                    <Activity className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Pending Submissions</p>
                  </div>
                  <p className="mt-2 text-3xl font-bold text-givit-ink">{analyticsData.pendingSubmissions?.pending_count ?? 0}</p>
                </div>
                <div className="givit-panel p-4">
                  <div className="flex items-center gap-2 text-givit-ember">
                    <Users className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Recent DAU</p>
                  </div>
                  <p className="mt-2 text-3xl font-bold text-givit-ink">
                    {analyticsData.dau?.[0]?.dau ?? 0}
                  </p>
                </div>
                <div className="givit-panel p-4">
                  <div className="flex items-center gap-2 text-givit-ember">
                    <DollarSign className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Today's Revenue</p>
                  </div>
                  <p className="mt-2 text-3xl font-bold text-givit-ink">
                    ${analyticsData.revenue?.[0] ? (analyticsData.revenue[0].revenue_cents / 100).toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="givit-panel p-4">
                  <div className="flex items-center gap-2 text-givit-ember">
                    <ShoppingBag className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-wider">Today's Orders</p>
                  </div>
                  <p className="mt-2 text-3xl font-bold text-givit-ink">
                    {analyticsData.revenue?.[0]?.orders ?? 0}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="givit-section p-4">
                  <h2 className="font-semibold text-givit-ink">User tracking events</h2>
                  <p className="mt-1 text-3xl font-bold text-givit-ink">{localEvents.length}</p>
                  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs text-muted-foreground">
                    {localEvents.slice(0, 8).map((event: any) => <div key={event.id} className="rounded bg-muted/50 p-2"><b>{event.eventType}</b> · {new Date(event.createdAt).toLocaleString()}</div>)}
                  </div>
                </div>
                <div className="givit-section p-4">
                  <h2 className="font-semibold text-givit-ink">Error logging & monitoring</h2>
                  <p className="mt-1 text-3xl font-bold text-givit-ink">{monitoringErrors.length}</p>
                  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-xs text-muted-foreground">
                    {monitoringErrors.slice(0, 8).map((error: any) => <div key={error.id} className="rounded bg-rose-50 p-2 text-rose-800"><b>{error.source || "client"}</b>: {error.message}</div>)}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Top Products */}
                <div className="givit-section p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-givit-ember" />
                    <h2 className="font-semibold text-givit-ink">Top Products by Views</h2>
                  </div>
                  <div className="space-y-2">
                    {analyticsData.topProducts?.slice(0, 5).map((product: any, i: number) => (
                      <div key={product.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-givit-ember/10 text-[10px] font-bold text-givit-ember">{i + 1}</span>
                          <span className="font-medium text-foreground">{product.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{product.views} views</span>
                      </div>
                    ))}
                    {(!analyticsData.topProducts || analyticsData.topProducts.length === 0) && (
                      <p className="text-sm text-muted-foreground">No data yet. Start tracking events.</p>
                    )}
                  </div>
                </div>

                {/* Recent Revenue */}
                <div className="givit-section p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-givit-ember" />
                    <h2 className="font-semibold text-givit-ink">Revenue (Last 7 Days)</h2>
                  </div>
                  <div className="space-y-2">
                    {analyticsData.revenue?.slice(0, 7).map((day: any) => (
                      <div key={day.day} className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5 text-sm">
                        <span className="text-muted-foreground">{new Date(day.day).toLocaleDateString()}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{day.orders} orders</span>
                          <span className="font-medium text-foreground">${(day.revenue_cents / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                    {(!analyticsData.revenue || analyticsData.revenue.length === 0) && (
                      <p className="text-sm text-muted-foreground">No revenue data yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* SUBMISSIONS TAB */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Customer-submitted products that need review. Approve to add to marketplace, or reject.
          </p>
          {submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
              <CheckSquare className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 font-semibold text-muted-foreground">No pending submissions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub: any) => (
                <div key={sub.id} className="givit-panel flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{sub.name || "Unnamed product"}</p>
                    <p className="text-xs text-muted-foreground truncate">{sub.url}</p>
                    {sub.brand && <p className="text-xs text-muted-foreground">Brand: {sub.brand}</p>}
                    {sub.category && <p className="text-xs text-muted-foreground">AI category: {sub.category}</p>}
                    {(sub.scraped_metadata?.aiSummary || sub.description) && <p className="mt-1 text-xs text-muted-foreground">{sub.scraped_metadata?.aiSummary || sub.description}</p>}
                    {sub.price_cents && <p className="text-xs font-semibold text-givit-ember">${(sub.price_cents / 100).toFixed(2)}</p>}
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Submitted by {sub.profiles?.full_name || sub.profiles?.email || "Anonymous"}</span>
                      <span>·</span>
                      <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      sub.status === "pending" ? "bg-amber-100 text-amber-700" :
                      sub.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                      "bg-rose-100 text-rose-700"
                    }`}>{sub.status}</span>
                  </div>
                  {sub.status === "pending" && (
                    <div className="flex shrink-0 gap-2">
                      <Button onClick={() => handleApproveSubmission(sub.id)} size="sm" className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button onClick={() => handleRejectSubmission(sub.id)} size="sm" variant="outline" className="rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10">
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {autoGiftOrders.length > 0 && (
            <div className="rounded-lg border border-givit-ember/30 bg-givit-ember/5 p-4">
              <h3 className="font-semibold text-givit-ink">AutoGift admin fulfillment queue</h3>
              <div className="mt-3 space-y-3">
                {autoGiftOrders.map((order) => (
                  <div key={order.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{order.recipientName} · {order.occasion}</p>
                        <p className="text-xs text-muted-foreground">{order.chargeNote}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{order.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Ship to {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                    <ul className="mt-1 space-y-0.5">
                      {order.items.map((item: any, idx: number) => (
                        <li key={idx} className="text-xs text-muted-foreground">
                          {item.productUrl ? (
                            <a href={item.productUrl} target="_blank" rel="noreferrer" className="font-medium text-givit-ember underline">{item.productName}</a>
                          ) : (
                            <span className="font-medium text-foreground">{item.productName}</span>
                          )}
                          {" "}(${(item.price / 100).toFixed(2)}){item.notes ? ` · ${item.notes}` : ""}
                        </li>
                      ))}
                    </ul>
                    {order.customerNotes && <p className="mt-2 rounded bg-muted/50 p-2 text-xs text-muted-foreground"><span className="font-semibold text-givit-ink">Customer note: </span>{order.customerNotes}</p>}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">Charge saved card: ${(order.total / 100).toFixed(2)}</p>
                      {order.status !== "admin_fulfillment" && order.status !== "shipped" && order.status !== "delivered" && (
                        <Button
                          size="sm"
                          className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover"
                          onClick={async () => {
                            await updateAutoGiftOrderStatusInDb(order.id, "admin_fulfillment");
                            setAutoGiftOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "admin_fulfillment" } : o));
                          }}
                        >
                          Mark as fulfilling
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Order ID</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Items</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {allOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{order.id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 font-medium text-foreground">${(order.total_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      order.status === "delivered" ? "bg-emerald-100 text-emerald-700" :
                      order.status === "shipped" ? "bg-blue-100 text-blue-700" :
                      order.status === "cancelled" ? "bg-rose-100 text-rose-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>{order.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{order.order_items?.length ?? 0}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === "users" && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {allProfiles.map((profile: any) => (
                <tr key={profile.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{profile.full_name || "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{profile.email || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      profile.role === "admin" ? "bg-givit-ember/10 text-givit-ember" :
                      profile.role === "seller" ? "bg-blue-100 text-blue-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{profile.role}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(profile.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-serif text-xl font-bold text-givit-ink">
                {editingProduct.id ? "Edit Product" : "New Product"}
              </h2>
              <button type="button" onClick={() => setShowEditModal(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold">Name *</label>
                <input
                  value={editingProduct.name || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold">Slug</label>
                <input
                  value={editingProduct.slug || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value })}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold">Price (cents)</label>
                <input
                  type="number"
                  value={editingProduct.price_cents || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price_cents: parseInt(e.target.value) || 0 })}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold">Description</label>
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-semibold">YouTube video URL (optional)</label>
                <input
                  value={editingProduct.video_url || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, video_url: e.target.value || null })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                />
                <p className="text-xs text-muted-foreground">Shown as a "Watch video" button/redirect on the product card when set.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={editingProduct.is_published || false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, is_published: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="is_published" className="text-sm font-medium text-foreground">Published</label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button onClick={handleSaveProduct} className="flex-1 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
                  <Save className="h-4 w-4" /> Save Product
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function slugSafe(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
