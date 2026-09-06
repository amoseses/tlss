import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "wouter";
import { ArrowLeft, Gift, Trash2, UserPlus, Shuffle, Gem, Sparkles, ExternalLink, ListChecks, Users } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { GiftBox3D } from "@/components/ui/gift-box-3d";
import { useAuth } from "@/lib/auth/use-auth";
import {
  getSecretSantaGroup,
  getGroupParticipants,
  findProfileByEmail,
  addSecretSantaParticipant,
  removeSecretSantaParticipant,
  deleteSecretSantaGroup,
  getMySecretSantaParticipantRow,
  updateMySecretSantaWishlist,
  shuffleSecretSantaGroup,
  getMySecretSantaAssignment,
  type SecretSantaGroup,
  type SecretSantaParticipant,
  type SecretSantaRecipient,
} from "@/lib/supabase/secret-santa";
import { getCohort } from "@/lib/data/gifting-cohorts";
import { recommendGifts, type GiftRecommendResult } from "@/lib/gift-recommend";
import { formatMoney } from "@/lib/format";

export default function SecretSantaGroupPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading } = useAuth();
  const [, navigate] = useLocation();

  const [group, setGroup] = useState<SecretSantaGroup | null | undefined>(undefined);
  const [participants, setParticipants] = useState<SecretSantaParticipant[]>([]);
  const [myRow, setMyRow] = useState<SecretSantaParticipant | null>(null);
  const [assignment, setAssignment] = useState<SecretSantaRecipient | null | undefined>(undefined);
  const [picks, setPicks] = useState<GiftRecommendResult[]>([]);

  const [addEmail, setAddEmail] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [notes, setNotes] = useState("");
  const [interestsText, setInterestsText] = useState("");
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [wishlistError, setWishlistError] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate(`/login?next=/secret-santa/${id}`);
  }, [loading, user, id, navigate]);

  async function loadAll() {
    if (!user || !id) return;
    const g = await getSecretSantaGroup(id);
    setGroup(g);
    if (!g) return;
    const mine = await getMySecretSantaParticipantRow(id, user.id);
    setMyRow(mine);
    setNotes(mine?.wishlist_notes ?? "");
    setInterestsText((mine?.interests ?? []).join(", "));
    if (g.organizer_id === user.id) {
      setParticipants(await getGroupParticipants(id));
    }
    if (g.status === "shuffled" && mine) {
      const a = await getMySecretSantaAssignment(id);
      setAssignment(a);
    } else {
      setAssignment(null);
    }
  }

  useEffect(() => { loadAll(); }, [user, id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!assignment) { setPicks([]); return; }
    // The actual "two-way street" recommendation: the recipient's own
    // stated interests/notes drive the search as usual, and the CURRENT
    // user's (the giver's) gifting cohort nudges which of the matching
    // products surface first -- see gift-recommend.ts's cohortBoost.
    const gifterTraits = getCohort(profile?.gifting_cohort)?.traits ?? [];
    const query = [
      assignment.interests.length > 0 ? `Interests: ${assignment.interests.join(", ")}.` : "",
      group?.occasion ? `Occasion: ${group.occasion}.` : "Occasion: gift exchange.",
      group?.budget_cents ? `Budget under $${Math.round(group.budget_cents / 100)}.` : "",
      assignment.wishlist_notes || "",
    ].filter(Boolean).join(" ");
    const { results } = recommendGifts(query || "a thoughtful gift", {}, 6, { gifterTraits });
    setPicks(results);
  }, [assignment, profile?.gifting_cohort, group?.occasion, group?.budget_cents]);

  async function handleAddParticipant(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !addEmail.trim() || adding) return;
    setAdding(true);
    setAddError("");
    const email = addEmail.trim();
    const found = await findProfileByEmail(email);
    if (!found) {
      setAddError("No GIVIT account found for that email yet -- they'll need to sign up first.");
      setAdding(false);
      return;
    }
    const { error } = await addSecretSantaParticipant({ groupId: id, email: found.email, name: found.full_name || found.email, userId: found.id });
    setAdding(false);
    if (error) { setAddError(error.message.includes("duplicate") ? "That person is already in this group." : "Couldn't add that person."); return; }
    setAddEmail("");
    setParticipants(await getGroupParticipants(id));
  }

  async function handleRemove(participantId: string) {
    if (!id) return;
    if (!confirm("Remove this person from the group?")) return;
    await removeSecretSantaParticipant(participantId);
    setParticipants(await getGroupParticipants(id));
  }

  async function handleShuffle() {
    if (!id || shuffling) return;
    setShuffling(true);
    const { error } = await shuffleSecretSantaGroup(id);
    setShuffling(false);
    if (error) { setAddError(error.message || "Couldn't shuffle yet."); return; }
    await loadAll();
  }

  async function handleSaveWishlist(e: React.FormEvent) {
    e.preventDefault();
    if (!myRow || savingWishlist) return;
    setSavingWishlist(true);
    const interests = interestsText.split(",").map((s) => s.trim()).filter(Boolean);
    const { error } = await updateMySecretSantaWishlist(myRow.id, { wishlist_notes: notes, interests });
    setSavingWishlist(false);
    setWishlistError(error ? "Couldn't save -- try again." : "");
  }

  async function handleDeleteGroup() {
    if (!id || !group) return;
    if (!confirm("Delete this group? This can't be undone.")) return;
    await deleteSecretSantaGroup(id);
    navigate("/secret-santa");
  }

  if (loading || !user || group === undefined) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  if (!group) {
    return (
      <PageShell className="max-w-2xl">
        <p className="text-center text-sm text-muted-foreground">This group doesn't exist, or you're not part of it.</p>
      </PageShell>
    );
  }

  const isOrganizer = group.organizer_id === user.id;

  return (
    <PageShell className="max-w-2xl">
      <Link href="/secret-santa" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All groups
      </Link>

      {/* Same dark instrument-panel hero as the group list page -- a group
          detail page is where people actually spend time (wishlist, reveal),
          so it earns the same premium treatment as the entry point. */}
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-black p-6 text-white shadow-xl md:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-givit-coral/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 -bottom-8 h-48 w-48 rounded-full bg-givit-ember/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={`flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest ${group.status === "shuffled" ? "text-success" : "text-givit-coral"}`}>
              {group.status === "shuffled" ? <Sparkles className="h-3 w-3" /> : <Gem className="h-3 w-3" />}
              {group.status === "shuffled" ? "Shuffled" : "Not shuffled yet"}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight">{group.name}</h1>
            <p className="mt-1 text-sm text-white/60">
              {group.occasion || "Gift exchange"}
              {group.budget_cents ? ` · $${(group.budget_cents / 100).toFixed(0)} per person` : ""}
              {group.event_date ? ` · ${new Date(group.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
            </p>
            {isOrganizer && (
              <button type="button" onClick={handleDeleteGroup} className="mt-3 flex items-center gap-1 text-xs font-medium text-white/40 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Delete group
              </button>
            )}
          </div>
          <div className="hidden shrink-0 sm:block">
            <GiftBox3D size={72} glow={0.3} />
          </div>
        </div>
      </section>

      {/* My wishlist -- what I'd like to receive, visible to whoever draws me */}
      <div className="givit-panel mb-6 p-5">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-givit-ember" />
          <h2 className="font-serif text-lg font-bold text-givit-ink">What you'd like</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Shown to whoever draws your name -- interests + anything specific you're hoping for.</p>
        <form onSubmit={handleSaveWishlist} className="mt-3 space-y-2">
          <input
            value={interestsText}
            onChange={(e) => setInterestsText(e.target.value)}
            placeholder="Interests, comma-separated: coffee, hiking, reading..."
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything specific -- sizes, colors, things to avoid..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
          />
          <Button type="submit" size="sm" disabled={savingWishlist} className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
            {savingWishlist ? "Saving..." : "Save"}
          </Button>
          {wishlistError && <p className="text-xs font-medium text-destructive">{wishlistError}</p>}
        </form>
        {!myRow && isOrganizer && <p className="mt-2 text-xs text-muted-foreground">Add your own email below to join the exchange yourself.</p>}
      </div>

      {/* Organizer: manage participants + shuffle */}
      {isOrganizer && (
        <div className="givit-panel mb-6 p-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-givit-ember" />
            <h2 className="font-serif text-lg font-bold text-givit-ink">Participants ({participants.length})</h2>
          </div>
          <div className="mt-3 space-y-2">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5 text-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full givit-gradient text-xs font-bold text-white">
                  {p.name.trim().slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                </div>
                {group.status === "open" && (
                  <button type="button" onClick={() => handleRemove(p.id)} aria-label="Remove" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {group.status === "open" && (
            <>
              <form onSubmit={handleAddParticipant} className="mt-3 flex flex-wrap gap-2">
                <input
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="their@email.com"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                />
                <Button type="submit" size="sm" disabled={adding} variant="outline" className="rounded-lg">
                  <UserPlus className="h-4 w-4" /> {adding ? "Adding..." : "Add"}
                </Button>
              </form>
              {addError && <p className="mt-2 text-xs font-medium text-destructive">{addError}</p>}
              <Button
                onClick={handleShuffle}
                disabled={participants.length < 3 || shuffling}
                className="mt-4 w-full rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover disabled:opacity-50"
              >
                <Shuffle className="h-4 w-4" /> {shuffling ? "Shuffling..." : "Shuffle & assign"}
              </Button>
              {participants.length < 3 && <p className="mt-2 text-center text-xs text-muted-foreground">Need at least 3 people to shuffle.</p>}
            </>
          )}
        </div>
      )}

      {/* My assignment -- only ever the caller's own, via the RPC */}
      {group.status === "shuffled" && myRow && (
        <div className="givit-section relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-givit-coral/10 blur-3xl" />
          {assignment === undefined ? (
            <div className="flex justify-center py-6"><div className="h-5 w-5 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" /></div>
          ) : assignment ? (
            <div className="slide-up relative">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl givit-gradient givit-glow text-white">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-givit-ember">You're giving to</p>
                  <p className="font-serif text-2xl font-bold text-givit-ink">{assignment.name}</p>
                </div>
              </div>
              {assignment.wishlist_notes && <p className="mt-3 text-sm italic leading-6 text-muted-foreground">"{assignment.wishlist_notes}"</p>}
              {assignment.interests.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {assignment.interests.map((i) => <span key={i} className="tag-pill capitalize">{i}</span>)}
                </div>
              )}

              {picks.length > 0 && (
                <div className="mt-5 border-t border-border/50 pt-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-givit-ember" /> Picks for {assignment.name.split(" ")[0]}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {picks.map((r) => (
                      <Link key={r.id} href={`/products/${r.slug}`} className="rounded-xl border border-border bg-card p-3 transition hover:border-givit-ember/40">
                        <p className="line-clamp-2 text-sm font-semibold text-foreground">{r.name}</p>
                        <p className="mt-1 text-xs italic leading-snug text-muted-foreground line-clamp-2">{r.match_reason}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-bold text-givit-ember">{formatMoney(r.sale_price_cents ?? r.price_cents)}</span>
                          <span className="flex items-center gap-1 text-xs font-semibold text-givit-ember"><ExternalLink className="h-3 w-3" /> View</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No assignment found for you in this group.</p>
          )}
        </div>
      )}

      {group.status === "open" && !isOrganizer && (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-givit-sand/40 p-5 text-sm text-muted-foreground">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-givit-ember/10">
            <Gem className="h-4 w-4 text-givit-ember" />
          </div>
          Waiting on the organizer to shuffle -- you'll see who you're giving to here once they do.
        </div>
      )}
    </PageShell>
  );
}
