import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { ShoppingBag, Sparkles, ArrowLeft, ExternalLink } from "lucide-react";
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
  items: Array<{ id: string; name: string; quantity: number; priceCents: number; productUrl?: string }>;
};

const STATUS_STYLES: Record<string, string> = {
  delivered: "bg-success/10 text-success",
  shipped: "bg-blue-100 text-blue-700",
  ordered: "bg-blue-100 text-blue-700",
  paid_pending_fulfillment: "bg-amber-100 text-amber-700",
  admin_fulfillment: "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  pending_approval: "bg-amber-100 text-amber-700",
  submitted: "bg-amber-100 text-amber-700",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-destructive/10 text-destructive",
};

// AutoGift orders are created the moment the customer clicks "Approve &
// send to admin" during checkout -- their approval already happened, so
// the raw DB status "pending_approval" would misleadingly read as "we're
// still waiting on you." It actually means the concierge team hasn't
// sourced/fulfilled it yet.
const STATUS_LABELS: Record<string, string> = {
  pending_approval: "Submitted, sourcing now",
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
    productUrl: item.productUrl ?? undefined,
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
            productUrl: item.external_url ?? undefined,
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

              {order.source === "autogift" && order.status === "pending_approval" && (
                <p className="mt-2 text-xs text-muted-foreground">You already approved this order. Nothing else to do: our concierge sources and ships each item, no retailer checkout on your end.</p>
              )}

              {order.items.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-muted-foreground">
                        {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}
                        {item.productUrl && (
                          <a href={item.productUrl} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-givit-ember hover:underline">
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </span>
                      <span className="shrink-0 font-medium text-foreground">${(item.priceCents / 100).toFixed(2)}</span>
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
