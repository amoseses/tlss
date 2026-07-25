import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { ShoppingBag, Sparkles, ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";
import { getUserOrders, getUserAutoGiftOrders } from "@/lib/supabase/db";

type UnifiedOrder = {
  id: string;
  source: "marketplace" | "autogift";
  createdAt: string;
  status: string;
  totalCents: number;
  recipientName?: string;
  occasion?: string;
  cardMessage?: string;
  items: Array<{ id: string; name: string; quantity: number; priceCents: number }>;
};

const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-emerald-100 text-emerald-700",
  shipped: "bg-blue-100 text-blue-700",
  ordered: "bg-blue-100 text-blue-700",
  paid_pending_fulfillment: "bg-amber-100 text-amber-700",
  admin_fulfillment: "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  submitted: "bg-amber-100 text-amber-700",
  cancelled: "bg-rose-100 text-rose-700",
  refunded: "bg-rose-100 text-rose-700",
};

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// The AutoGift survey stores its bundle as a raw items array (JSON column,
// no fixed shape guarantee), so this normalizes whatever key names ended up
// in there rather than assuming one exact schema.
function normalizeAutoGiftItems(raw: unknown): UnifiedOrder["items"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any, i: number) => ({
    id: item.id ?? String(i),
    name: item.productName ?? item.name ?? "Gift item",
    quantity: item.quantity ?? 1,
    priceCents: item.price ?? item.priceCents ?? 0,
  }));
}

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [orders, setOrders] = useState<UnifiedOrder[] | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/orders");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    Promise.all([getUserOrders(user.id), getUserAutoGiftOrders(user.id)]).then(([marketplaceOrders, autoGiftOrders]) => {
      if (!mounted) return;
      const unified: UnifiedOrder[] = [
        ...marketplaceOrders.map((o: any) => ({
          id: o.id,
          source: "marketplace" as const,
          createdAt: o.created_at,
          status: o.status,
          totalCents: o.total_cents,
          items: (o.order_items ?? []).map((item: any) => ({
            id: item.id,
            name: item.product_name ?? "Item",
            quantity: item.quantity ?? 1,
            priceCents: item.unit_price_cents ?? 0,
          })),
        })),
        ...autoGiftOrders.map((o: any) => ({
          id: o.id,
          source: "autogift" as const,
          createdAt: o.created_at,
          status: o.status,
          totalCents: o.total_cents,
          recipientName: o.recipient_name,
          occasion: o.occasion,
          cardMessage: o.card_message,
          items: normalizeAutoGiftItems(o.items),
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(unified);
    });
    return () => { mounted = false; };
  }, [user]);

  if (loading || !user) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-3xl">
      <Link href="/account" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to account
      </Link>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Order history</p>
        <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Your orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Marketplace purchases and AutoGift orders, newest first.</p>
      </div>

      {orders === null ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-givit-ember/10">
            <ShoppingBag className="h-6 w-6 text-givit-ember" />
          </div>
          <p className="mt-4 font-serif text-xl font-bold text-givit-ink">No orders yet</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">Orders you place in the marketplace or approve through AutoGift will show up here.</p>
          <div className="mt-5 flex gap-3">
            <Link href="/products" className="rounded-full bg-givit-ember px-5 py-2 text-sm font-semibold text-white hover:bg-givit-ember-hover">Browse marketplace</Link>
            <Link href="/concierge" className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground hover:border-givit-ember/40">Go to AutoGift</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={`${order.source}-${order.id}`} className="givit-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {order.source === "autogift" ? <Sparkles className="h-4 w-4 text-givit-ember" /> : <ShoppingBag className="h-4 w-4 text-givit-ember" />}
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {order.source === "autogift" ? `AutoGift for ${order.recipientName ?? "recipient"}` : "Marketplace order"}
                      {order.occasion ? ` · ${order.occasion}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[order.status] ?? "bg-muted text-muted-foreground"}`}>
                  {statusLabel(order.status)}
                </span>
              </div>

              {order.items.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}</span>
                      <span className="font-medium text-foreground">${(item.priceCents / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {order.cardMessage && (
                <p className="mt-3 rounded-lg bg-givit-sand p-3 font-serif text-sm italic text-givit-ink">"{order.cardMessage}"</p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                <span className="text-sm font-semibold text-foreground">Total</span>
                <span className="font-bold text-givit-ember">${(order.totalCents / 100).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
