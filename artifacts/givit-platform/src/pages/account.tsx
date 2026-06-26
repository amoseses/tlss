import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { User, Package, Heart, Settings, MapPin, CreditCard, Gift, ShoppingBag, Star, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";
import { getUserOrders, getUserAddresses, getUserPaymentMethods, getWishlist, updateProfile, saveUserAddress, saveUserPaymentMethod } from "@/lib/supabase/db";

export default function AccountPage() {
  const { user, profile, loading } = useAuth();
  const [, navigate] = useLocation();
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Profile editing state
  const [editingProfile, setEditingProfile] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [addressForm, setAddressForm] = useState({ label: "Home", line1: "", city: "", state: "", zip: "" });
  const [cardForm, setCardForm] = useState({ brand: "", last4: "" });

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/account");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    async function load() {
      setDataLoading(true);
      try {
        const [ordersData, addressesData, paymentData, wishlistData] = await Promise.all([
          getUserOrders(userId),
          getUserAddresses(userId),
          getUserPaymentMethods(userId),
          getWishlist(userId),
        ]);
        setOrders(ordersData);
        setAddresses(addressesData);
        setPaymentMethods(paymentData);
        setWishlist(wishlistData);
      } catch (err) {
        console.error("Failed to load account data:", err);
      } finally {
        setDataLoading(false);
      }
    }
    load();
  }, [user]);

  // Sync profile fields when loaded
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone((profile as any).phone || "");
    }
  }, [profile]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileError("");
    try {
      const { error } = await updateProfile(user.id, {
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      });
      if (error) throw new Error(error.message || "Failed to update profile");
      setEditingProfile(false);
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAddressSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { data } = await saveUserAddress({ user_id: user.id, ...addressForm, country: "US", is_default: addresses.length === 0 });
    if (data) setAddresses((prev) => [data, ...prev]);
    setAddressForm({ label: "Home", line1: "", city: "", state: "", zip: "" });
  }

  async function handlePaymentSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { data } = await saveUserPaymentMethod({ user_id: user.id, card_brand: cardForm.brand, card_last4: cardForm.last4, stripe_payment_method_id: `pending_stripe_setup_${Date.now()}`, is_default: paymentMethods.length === 0 });
    if (data) setPaymentMethods((prev) => [data, ...prev]);
    setCardForm({ brand: "", last4: "" });
  }

  if (loading || dataLoading) return <PageShell><div className="flex min-h-[400px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" /></div></PageShell>;
  if (!user) return null;

  return (
    <PageShell narrow>
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-givit-ember/10">
          <User className="h-7 w-7 text-givit-ember" />
        </div>
        <div className="flex-1">
          {editingProfile ? (
            <form onSubmit={handleProfileSave} className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Full name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                />
              </div>
              {profileError && <p className="text-xs text-destructive">{profileError}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={savingProfile} size="sm" className="rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">
                  {savingProfile ? "Saving..." : "Save"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditingProfile(false)} className="rounded-md">Cancel</Button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="font-serif text-2xl font-bold text-givit-ink">{profile?.full_name || "Your account"}</h1>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              {profile?.role === "admin" && (
                <span className="mt-1 inline-block rounded-full bg-givit-ember/10 px-2.5 py-0.5 text-xs font-semibold text-givit-ember">Admin</span>
              )}
              <button
                onClick={() => setEditingProfile(true)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-givit-ember hover:underline"
              >
                <Edit2 className="h-3 w-3" /> Edit profile
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Orders */}
        <div className="givit-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-givit-ember" />
            <h2 className="font-semibold text-givit-ink">Orders</h2>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 3).map((order: any) => (
                <div key={order.id} className="rounded-lg bg-muted/50 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">${(order.total_cents / 100).toFixed(2)}</span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${
                      order.status === "delivered" ? "bg-emerald-100 text-emerald-700" :
                      order.status === "shipped" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>{order.status}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
              ))}
              {orders.length > 3 && (
                <Link href="/orders" className="block text-center text-xs font-semibold text-givit-ember hover:underline">
                  View all {orders.length} orders →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Wishlist */}
        <div className="givit-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Heart className="h-4 w-4 text-givit-ember" />
            <h2 className="font-semibold text-givit-ink">Wishlist</h2>
          </div>
          {wishlist.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your wishlist is empty.</p>
          ) : (
            <div className="space-y-2">
              {wishlist.slice(0, 3).map((item: any) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                  {item.product_image && (
                    <img src={item.product_image} alt="" className="h-8 w-8 rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{item.product_name}</p>
                    {item.product_price_cents && (
                      <p className="text-[10px] text-muted-foreground">${(item.product_price_cents / 100).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))}
              {wishlist.length > 3 && (
                <Link href="/products" className="block text-center text-xs font-semibold text-givit-ember hover:underline">
                  View all {wishlist.length} items →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Saved Addresses */}
        <div className="givit-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-givit-ember" />
            <h2 className="font-semibold text-givit-ink">Saved Addresses</h2>
          </div>
          {addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved addresses.</p>
          ) : (
            <div className="space-y-2">
              {addresses.map((addr: any) => (
                <div key={addr.id} className="rounded-lg bg-muted/50 p-2.5 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{addr.label}</span>
                    {addr.is_default && <span className="rounded bg-givit-ember/10 px-1.5 py-0.5 text-[10px] text-givit-ember">Default</span>}
                  </div>
                  <p className="mt-0.5 text-muted-foreground">{addr.line1}, {addr.city}, {addr.state} {addr.zip}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleAddressSave} className="givit-panel p-4 sm:col-span-2">
          <h2 className="mb-3 font-semibold text-givit-ink">Add or update shipping address</h2>
          <div className="grid gap-2 sm:grid-cols-5">
            <input value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} placeholder="Label" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
            <input required value={addressForm.line1} onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })} placeholder="Street address" className="h-10 rounded-md border border-border bg-background px-3 text-sm sm:col-span-2" />
            <input required value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} placeholder="City" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
            <input required value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} placeholder="State" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
            <input required value={addressForm.zip} onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })} placeholder="ZIP" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <Button type="submit" size="sm" className="mt-3 rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">Save address</Button>
        </form>

        {/* Payment Methods */}
        <div className="givit-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-givit-ember" />
            <h2 className="font-semibold text-givit-ink">Payment Methods</h2>
          </div>
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved payment methods.</p>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map((pm: any) => (
                <div key={pm.id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2.5 text-xs">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{pm.card_brand} •••• {pm.card_last4}</span>
                  {pm.is_default && <span className="rounded bg-givit-ember/10 px-1.5 py-0.5 text-[10px] text-givit-ember">Default</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handlePaymentSave} className="givit-panel p-4 sm:col-span-2">
          <h2 className="mb-2 font-semibold text-givit-ink">Add Stripe payment method</h2>
          <p className="mb-3 text-xs text-muted-foreground">Production should use Stripe Elements/SetupIntents; this profile view only stores the tokenized brand and last 4 returned by Stripe.</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input required value={cardForm.brand} onChange={(e) => setCardForm({ ...cardForm, brand: e.target.value })} placeholder="Brand (Visa)" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
            <input required value={cardForm.last4} onChange={(e) => setCardForm({ ...cardForm, last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="Last 4" className="h-10 rounded-md border border-border bg-background px-3 text-sm" />
            <Button type="submit" size="sm" className="rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">Save payment</Button>
          </div>
        </form>
      </div>

      {/* Quick Links */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href="/concierge" className="givit-panel flex items-center gap-3 p-4 transition hover:border-givit-ember/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-givit-ember/10">
            <Settings className="h-5 w-5 text-givit-ember" />
          </div>
          <div>
            <p className="font-semibold text-givit-ink">AutoGift</p>
            <p className="text-xs text-muted-foreground">Manage gift automation</p>
          </div>
        </Link>
        <Link href="/gift" className="givit-panel flex items-center gap-3 p-4 transition hover:border-givit-ember/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-givit-ember/10">
            <Gift className="h-5 w-5 text-givit-ember" />
          </div>
          <div>
            <p className="font-semibold text-givit-ink">Givit AI</p>
            <p className="text-xs text-muted-foreground">Find gifts with AI</p>
          </div>
        </Link>
        <Link href="/boards" className="givit-panel flex items-center gap-3 p-4 transition hover:border-givit-ember/30">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-givit-ember/10">
            <Star className="h-5 w-5 text-givit-ember" />
          </div>
          <div>
            <p className="font-semibold text-givit-ink">Gift Boards</p>
            <p className="text-xs text-muted-foreground">Your curated boards</p>
          </div>
        </Link>
      </div>
    </PageShell>
  );
}