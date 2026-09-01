import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { useLocation, Link } from "wouter";
import { User, Heart, Settings, MapPin, CreditCard, Gift, ShoppingBag, Star, Edit2, PlusCircle, Trash2, Camera, Shuffle } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { useAuth } from "@/lib/auth/use-auth";
import { getUserOrders, getUserAutoGiftOrders, getUserAddresses, getUserPaymentMethods, getWishlist, updateProfile, saveUserAddress, saveUserPaymentMethod, deleteUserAddress, deleteUserPaymentMethod } from "@/lib/supabase/db";
import { NotificationSettingsCard } from "@/components/personalization/notification-settings";
import { getStripePromise, hasStripePublishableKey } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/client";
import { normalizePhoneE164 } from "@/lib/utils";
import { addressValidationError } from "@/lib/validation/autogift";
import { uploadFileToS3 } from "@/lib/upload";
import { getCohort } from "@/lib/data/gifting-cohorts";
import { GiftingQuizModal, CohortMark } from "@/components/personalization/gifting-quiz-modal";

async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  return fetch(path, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

type ConfirmedPaymentMethod = { id: string; brand: string; last4: string };
type PaymentFormHandle = { submit: () => Promise<{ ok: true; method: ConfirmedPaymentMethod } | { ok: false; error: string }> };

// Same pattern as the AutoGift onboarding wizard's PaymentElementForm: card
// fields never touch GIVIT's own state or servers, Stripe's PaymentElement
// runs inside Stripe's own iframe, and confirmSetup() only ever hands this
// component back an opaque payment_method ID.
type PaymentElementFormProps = { onReady?: () => void; onLoadError?: (message: string) => void };
const PaymentElementForm = forwardRef<PaymentFormHandle, PaymentElementFormProps>(function PaymentElementForm({ onReady, onLoadError }, ref) {
  const stripe = useStripe();
  const elements = useElements();

  useImperativeHandle(ref, () => ({
    async submit() {
      if (!stripe || !elements) return { ok: false, error: "Payment form is still loading." };
      const { error: submitError } = await elements.submit();
      if (submitError) return { ok: false, error: submitError.message || "Enter valid card details." };
      const { error, setupIntent } = await stripe.confirmSetup({ elements, redirect: "if_required" });
      if (error) return { ok: false, error: error.message || "Card couldn't be saved." };
      const paymentMethodId = typeof setupIntent?.payment_method === "string" ? setupIntent.payment_method : setupIntent?.payment_method?.id;
      if (!paymentMethodId) return { ok: false, error: "Card couldn't be saved." };
      try {
        const res = await authedFetch(`/api/stripe/setup-intent?paymentMethodId=${encodeURIComponent(paymentMethodId)}`, { method: "GET" });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error || "Card was saved, but details couldn't be confirmed." };
        return { ok: true, method: { id: paymentMethodId, brand: data.brand, last4: data.last4 } };
      } catch (err: any) {
        return { ok: false, error: err.message || "Card was saved, but details couldn't be confirmed." };
      }
    },
  }));

  return (
    <PaymentElement
      options={{ layout: "tabs" }}
      onReady={onReady}
      onLoadError={(event) =>
        onLoadError?.(event.error.message || "The payment form couldn't load. Check your connection or disable ad blockers, then try again.")
      }
    />
  );
});

export default function AccountPage() {
  const { user, profile, loading, refresh } = useAuth();
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
  const [addressForm, setAddressForm] = useState({ label: "Home", line1: "", city: "", state: "", zip: "", country: "US" });
  const [accountNotice, setAccountNotice] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const cohort = getCohort(profile?.gifting_cohort);

  async function saveCohort(cohortId: string) {
    if (!user) return;
    await updateProfile(user.id, { gifting_cohort: cohortId });
    refresh();
    setShowQuiz(false);
  }

  async function handleAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { setAccountNotice("Please choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setAccountNotice("Image is too large -- please choose one under 5MB."); return; }
    setUploadingAvatar(true);
    setAccountNotice("");
    try {
      const { url } = await uploadFileToS3(file, "avatars");
      const { error } = await updateProfile(user.id, { avatar_url: url });
      if (error) { setAccountNotice(error.message); return; }
      refresh();
    } catch (err: any) {
      setAccountNotice(err.message || "Couldn't upload that photo. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Payment via real Stripe Elements -- clientSecret is fetched fresh each
  // time "Add a card" is opened rather than kept around, same reasoning as
  // the AutoGift onboarding wizard.
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentFetching, setPaymentFetching] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const paymentFormRef = useRef<PaymentFormHandle>(null);
  const paymentReadyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login?next=/account");
  }, [loading, user, navigate]);

  // Same reasoning as the AutoGift onboarding wizard: a clientSecret alone
  // doesn't guarantee Stripe Elements will ever finish loading its iframe --
  // without this, a blocked script or revoked key left the card fields
  // (and the "Loading payment form…" text right above them) stuck forever.
  useEffect(() => {
    if (!paymentClientSecret) return;
    setPaymentReady(false);
    paymentReadyTimeoutRef.current = setTimeout(() => {
      setAccountNotice("The payment form is taking too long to load. Check your connection or disable ad blockers, then try again.");
    }, 12000);
    return () => {
      if (paymentReadyTimeoutRef.current) clearTimeout(paymentReadyTimeoutRef.current);
    };
  }, [paymentClientSecret]);

  function handlePaymentReady() {
    if (paymentReadyTimeoutRef.current) clearTimeout(paymentReadyTimeoutRef.current);
    setPaymentReady(true);
  }

  function handlePaymentLoadError(message: string) {
    if (paymentReadyTimeoutRef.current) clearTimeout(paymentReadyTimeoutRef.current);
    setAccountNotice(message);
  }

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    async function load() {
      setDataLoading(true);
      try {
        const [ordersData, autoGiftOrdersData, addressesData, paymentData, wishlistData] = await Promise.all([
          getUserOrders(userId),
          getUserAutoGiftOrders(userId),
          getUserAddresses(userId),
          getUserPaymentMethods(userId),
          getWishlist(userId),
        ]);
        // Orders panel here is a summary -- the full breakdown (marketplace
        // vs AutoGift, items, card message) lives on /orders. Normalizing
        // both sources to the same shape lets this panel show "N orders"
        // and a recent-3 preview without caring which table each came from.
        const normalized = [
          ...ordersData.map((o: any) => ({ id: o.id, total_cents: o.total_cents, status: o.status, created_at: o.created_at })),
          ...autoGiftOrdersData.map((o: any) => ({ id: o.id, total_cents: o.total_cents, status: o.status, created_at: o.created_at })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setOrders(normalized);
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
    // Stored unnormalized, a phone number silently breaks both outbound SMS
    // (SNS requires E.164) and inbound STOP/START replies (matched back to
    // a profile by exact E.164 string) -- rejecting an unrecognizable
    // number here beats saving something that fails silently later.
    const trimmedPhone = phone.trim();
    const normalizedPhone = trimmedPhone ? normalizePhoneE164(trimmedPhone) : null;
    if (trimmedPhone && !normalizedPhone) {
      setProfileError("Enter a valid US phone number, e.g. (555) 123-4567.");
      return;
    }
    setSavingProfile(true);
    setProfileError("");
    try {
      const { data, error } = await updateProfile(user.id, {
        full_name: fullName.trim() || null,
        phone: normalizedPhone,
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
    const addressError = addressValidationError(addressForm);
    if (addressError) { setAccountNotice(addressError); return; }
    const { error } = await saveUserAddress({ user_id: user.id, ...addressForm, is_default: addresses.length === 0 });
    if (error) { setAccountNotice(error.message); return; }
    setAddresses(await getUserAddresses(user.id));
    setAddressForm({ label: "Home", line1: "", city: "", state: "", zip: "", country: "US" });
    setAccountNotice("Address saved.");
  }


  async function handleAddressDelete(addressId: string) {
    if (!user) return;
    const { error } = await deleteUserAddress(user.id, addressId);
    if (error) { setAccountNotice(error.message); return; }
    setAddresses(addresses.filter((addr) => addr.id !== addressId));
    setAccountNotice("Address deleted.");
  }

  async function handlePaymentDelete(paymentMethodId: string) {
    if (!user) return;
    const { error } = await deleteUserPaymentMethod(user.id, paymentMethodId);
    if (error) { setAccountNotice(error.message); return; }
    setPaymentMethods(paymentMethods.filter((pm) => pm.id !== paymentMethodId));
    setAccountNotice("Payment method deleted.");
  }

  async function startAddingPayment() {
    setAddingPayment(true);
    setAccountNotice("");
    if (paymentClientSecret || paymentFetching) return;
    if (!hasStripePublishableKey()) {
      setAccountNotice("Payments aren't configured for this environment yet. Please try again later or contact support.");
      return;
    }
    setPaymentFetching(true);
    try {
      const res = await authedFetch("/api/stripe/setup-intent", { method: "POST" });
      const data = await res.json();
      if (data.clientSecret) setPaymentClientSecret(data.clientSecret);
      else setAccountNotice(data.error || "Couldn't load the payment form.");
    } catch (err: any) {
      setAccountNotice(err.message || "Couldn't load the payment form.");
    } finally {
      setPaymentFetching(false);
    }
  }

  async function handlePaymentSave() {
    if (!user || !paymentFormRef.current) return;
    setSavingPayment(true);
    const result = await paymentFormRef.current.submit();
    if (!result.ok) {
      setSavingPayment(false);
      setAccountNotice(result.error);
      return;
    }
    const { error } = await saveUserPaymentMethod({
      user_id: user.id,
      stripe_payment_method_id: result.method.id,
      card_brand: result.method.brand,
      card_last4: result.method.last4,
      is_default: paymentMethods.length === 0,
    });
    setSavingPayment(false);
    if (error) { setAccountNotice(error.message); return; }
    setPaymentMethods(await getUserPaymentMethods(user.id));
    setAddingPayment(false);
    setPaymentClientSecret(null);
    setAccountNotice("Payment method saved for Stripe checkout / AutoGift approvals.");
  }

  if (loading || dataLoading) return <PageShell><div className="flex min-h-[400px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" /></div></PageShell>;
  if (!user) return null;

  return (
    <PageShell className="max-w-4xl">
      <div className="mb-6 overflow-hidden rounded-2xl border border-givit-ember/20 bg-gradient-to-br from-givit-ember/15 to-givit-coral/10 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="group/avatar relative h-16 w-16 shrink-0">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-givit-ember/10">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-7 w-7 text-givit-ember" />
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Change profile photo"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-transparent transition group-hover/avatar:bg-black/40 group-hover/avatar:text-white disabled:cursor-wait"
            >
              {uploadingAvatar ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarSelected} className="hidden" />
          </div>
          <div className="flex-1 py-1">
            {editingProfile ? (
              <form onSubmit={handleProfileSave} className="max-w-sm space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Full name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>
                {profileError && <p className="text-xs text-destructive">{profileError}</p>}
                <div className="flex gap-2 pt-1">
                  <Button type="submit" disabled={savingProfile} size="sm" className="rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">
                    {savingProfile ? "Saving..." : "Save"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingProfile(false)} className="rounded-md">Cancel</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <h1 className="font-serif text-2xl font-bold leading-tight text-givit-ink">{profile?.full_name || "Your account"}</h1>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                {profile?.role === "admin" && (
                  <span className="inline-block rounded-full bg-givit-ember/10 px-2.5 py-0.5 text-xs font-semibold text-givit-ember">Admin</span>
                )}
                {cohort ? (
                  <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 px-3 py-2">
                    <CohortMark cohort={cohort} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-givit-ink">{cohort.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{cohort.tagline}</p>
                    </div>
                    <button type="button" onClick={() => setShowQuiz(true)} className="ml-auto shrink-0 text-xs font-semibold text-givit-ember hover:underline">Retake</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowQuiz(true)}
                    className="flex w-fit items-center gap-1.5 rounded-full border border-givit-ember/30 bg-givit-ember/5 px-3 py-1.5 text-xs font-semibold text-givit-ember transition hover:bg-givit-ember/10"
                  >
                    Find your gifting personality →
                  </button>
                )}
                <button
                  onClick={() => setEditingProfile(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-givit-ember hover:underline"
                >
                  <Edit2 className="h-3 w-3" /> Edit profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {accountNotice && <div className="mb-4 rounded-xl bg-givit-ember/10 px-4 py-3 text-sm text-givit-ink">{accountNotice}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orders */}
        <div className="givit-panel p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-givit-ember" />
            <h2 className="font-semibold text-givit-ink">Orders</h2>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-2.5">
              {orders.slice(0, 3).map((order: any) => (
                <div key={order.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">${(order.total_cents / 100).toFixed(2)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      order.status === "delivered" ? "bg-emerald-100 text-emerald-700" :
                      order.status === "shipped" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>{order.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
              ))}
              <Link href="/orders" className="block pt-1 text-center text-sm font-semibold text-givit-ember hover:underline">
                View all {orders.length} order{orders.length !== 1 ? "s" : ""} →
              </Link>
            </div>
          )}
        </div>

        {/* Wishlist */}
        <div className="givit-panel p-6">
          <div className="mb-4 flex items-center gap-2">
            <Heart className="h-4 w-4 text-givit-ember" />
            <h2 className="font-semibold text-givit-ink">Wishlist</h2>
          </div>
          {wishlist.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your wishlist is empty.</p>
          ) : (
            <div className="space-y-2.5">
              {wishlist.slice(0, 3).map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5">
                  {item.product_image && (
                    <img src={item.product_image} alt="" className="h-10 w-10 rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.product_name}</p>
                    {item.product_price_cents && (
                      <p className="text-xs text-muted-foreground">${(item.product_price_cents / 100).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))}
              {wishlist.length > 3 && (
                <Link href="/wishlist" className="block pt-1 text-center text-sm font-semibold text-givit-ember hover:underline">
                  View all {wishlist.length} items →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Saved Addresses */}
        <div className="givit-panel p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-givit-ember" />
            <h2 className="font-semibold text-givit-ink">Saved Addresses</h2>
          </div>
          <form onSubmit={handleAddressSave} className="mb-4 grid gap-3 rounded-lg border border-border/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2"><input value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} placeholder="Label" className="h-10 rounded-md border border-border bg-background px-3 text-sm" /><input value={addressForm.line1} onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })} placeholder="Street address" required className="h-10 rounded-md border border-border bg-background px-3 text-sm" /></div>
            <div className="grid gap-3 sm:grid-cols-3"><input value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} placeholder="City" required className="h-10 rounded-md border border-border bg-background px-3 text-sm" /><input value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} placeholder="State" required className="h-10 rounded-md border border-border bg-background px-3 text-sm" /><input value={addressForm.zip} onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })} placeholder="ZIP" required className="h-10 rounded-md border border-border bg-background px-3 text-sm" /></div>
            <Button type="submit" size="sm" className="w-fit rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">Add address</Button>
          </form>
          {addresses.length === 0 ? <p className="text-sm text-muted-foreground">No saved addresses.</p> : (
            <div className="grid gap-2.5 sm:grid-cols-2">{addresses.map((addr: any) => (<div key={addr.id} className="rounded-lg bg-muted/50 p-3 text-sm"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1.5"><span className="font-medium text-foreground">{addr.label}</span>{addr.is_default && <span className="rounded bg-givit-ember/10 px-1.5 py-0.5 text-xs text-givit-ember">Default</span>}</div><button type="button" onClick={() => void handleAddressDelete(addr.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete address"><Trash2 className="h-3.5 w-3.5" /></button></div><p className="mt-1 text-xs text-muted-foreground">{addr.line1}, {addr.city}, {addr.state} {addr.zip}</p></div>))}</div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="givit-panel p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-givit-ember" />
            <h2 className="font-semibold text-givit-ink">Payment Methods</h2>
          </div>
          {!addingPayment ? (
            <Button type="button" size="sm" variant="outline" className="mb-4 rounded-md" onClick={startAddingPayment}>Add a card</Button>
          ) : (
            <div className="mb-4 space-y-3 rounded-lg border border-border/40 p-4">
              <p className="text-xs text-muted-foreground">Card details are handled directly by Stripe — they never touch GIVIT's own servers.</p>
              {paymentFetching ? (
                <p className="text-sm text-muted-foreground">Loading payment form…</p>
              ) : paymentClientSecret ? (
                <div className="relative">
                  {/* opacity, not `hidden`/display:none -- Stripe's PaymentElement
                      renders in an iframe that needs real layout dimensions to
                      initialize. Hide it under `display:none` and it never gets
                      a size to measure, so it never fires onReady -- which was
                      the actual "form doesn't load" bug: it was waiting to be
                      un-hidden by a ready event it could never reach while hidden. */}
                  {!paymentReady && (
                    <p className="absolute inset-0 flex items-center text-sm text-muted-foreground">Loading payment form…</p>
                  )}
                  <div className={paymentReady ? "" : "opacity-0"}>
                    <Elements stripe={getStripePromise()} options={{ clientSecret: paymentClientSecret }}>
                      <PaymentElementForm ref={paymentFormRef} onReady={handlePaymentReady} onLoadError={handlePaymentLoadError} />
                    </Elements>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-destructive">Couldn't load the payment form. Please try again.</p>
              )}
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={!paymentReady || savingPayment} onClick={handlePaymentSave} className="w-fit rounded-md bg-givit-ember text-white hover:bg-givit-ember-hover">
                  {savingPayment ? "Saving…" : "Save payment method"}
                </Button>
                <Button type="button" size="sm" variant="outline" className="rounded-md" onClick={() => { setAddingPayment(false); setPaymentClientSecret(null); }}>Cancel</Button>
              </div>
            </div>
          )}
          {paymentMethods.length === 0 ? <p className="text-sm text-muted-foreground">No saved payment methods.</p> : (
            <div className="grid gap-2.5 sm:grid-cols-2">{paymentMethods.map((pm: any) => (<div key={pm.id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm"><CreditCard className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-foreground">{pm.card_brand} •••• {pm.card_last4}</span>{pm.is_default && <span className="rounded bg-givit-ember/10 px-1.5 py-0.5 text-xs text-givit-ember">Default</span>}<button type="button" onClick={() => void handlePaymentDelete(pm.id)} className="ml-auto rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete payment method"><Trash2 className="h-3.5 w-3.5" /></button></div>))}</div>
          )}
        </div>

        {user && (
          <div className="lg:col-span-2">
            <NotificationSettingsCard
              userId={user.id}
              defaultLeadDays={profile?.default_reminder_lead_days ?? 35}
              phone={profile?.phone}
              smsOptIn={profile?.sms_opt_in}
              onSmsOptInChange={refresh}
            />
          </div>
        )}
      </div>

      {/* Quick Links -- ramps up gradually (2 -> 3 -> 6 columns) instead of
          jumping straight to equal columns at the "sm" (640px) breakpoint,
          which crammed each card into ~110px and wrapped labels unevenly.
          6 items divides evenly at every one of those column counts, so
          unlike the 5-item version this doesn't need an odd-card-out span. */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Link href="/people" className="givit-panel flex min-w-0 items-center gap-3 p-4 transition hover:border-givit-ember/30">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-givit-ember/10">
            <User className="h-5 w-5 text-givit-ember" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-givit-ink">People</p>
            <p className="text-xs text-muted-foreground">Manage saved people</p>
          </div>
        </Link>
        <Link href="/concierge" className="givit-panel flex min-w-0 items-center gap-3 p-4 transition hover:border-givit-ember/30">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-givit-ember/10">
            <Settings className="h-5 w-5 text-givit-ember" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-givit-ink">AutoGift</p>
            <p className="text-xs text-muted-foreground">Manage gift automation</p>
          </div>
        </Link>
        <Link href="/gift" className="givit-panel flex min-w-0 items-center gap-3 p-4 transition hover:border-givit-ember/30">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-givit-ember/10">
            <Gift className="h-5 w-5 text-givit-ember" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-givit-ink">Your Gift AI</p>
            <p className="text-xs text-muted-foreground">Find gifts with AI</p>
          </div>
        </Link>
        <Link href="/submit-product" className="givit-panel flex min-w-0 items-center gap-3 p-4 transition hover:border-givit-ember/30">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-givit-ember/10">
            <PlusCircle className="h-5 w-5 text-givit-ember" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-givit-ink">Submit product</p>
            <p className="text-xs text-muted-foreground">Add a gift for admin approval</p>
          </div>
        </Link>
        <Link href="/boards" className="givit-panel flex min-w-0 items-center gap-3 p-4 transition hover:border-givit-ember/30">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-givit-ember/10">
            <Star className="h-5 w-5 text-givit-ember" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-givit-ink">Gift Boards</p>
            <p className="text-xs text-muted-foreground">Your curated boards</p>
          </div>
        </Link>
        <Link href="/secret-santa" className="givit-panel flex min-w-0 items-center gap-3 p-4 transition hover:border-givit-ember/30">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-givit-ember/10">
            <Shuffle className="h-5 w-5 text-givit-ember" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-givit-ink">Secret Santa</p>
            <p className="text-xs text-muted-foreground">Group gift exchanges</p>
          </div>
        </Link>
      </div>
      {showQuiz && <GiftingQuizModal onClose={() => setShowQuiz(false)} onComplete={saveCohort} />}
    </PageShell>
  );
}
