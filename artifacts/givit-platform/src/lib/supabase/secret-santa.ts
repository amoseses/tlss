/**
 * Secret Santa data access. See admin-schema.sql's SECRET SANTA sections
 * for the actual privacy design -- the short version: who's assigned to
 * whom is never readable through a plain table query, by anyone, including
 * the organizer. shuffleGroup() and getMyAssignment() are the only two
 * functions here that touch that mapping, and both go through Postgres
 * RPCs (SECURITY DEFINER functions), not a table select.
 */
import { getDb } from "@/lib/supabase/db";

export type SecretSantaGroup = {
  id: string;
  name: string;
  organizer_id: string;
  occasion: string | null;
  budget_cents: number | null;
  event_date: string | null;
  status: "open" | "shuffled";
  created_at: string;
};

export type SecretSantaParticipant = {
  id: string;
  group_id: string;
  user_id: string | null;
  email: string;
  name: string;
  wishlist_notes: string | null;
  interests: string[];
  created_at: string;
};

export type SecretSantaRecipient = {
  name: string;
  wishlist_notes: string | null;
  interests: string[];
};

export async function createSecretSantaGroup(params: {
  organizerId: string;
  name: string;
  occasion?: string;
  budgetCents?: number;
  eventDate?: string;
}) {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("secret_santa_groups")
    .insert({
      organizer_id: params.organizerId,
      name: params.name,
      occasion: params.occasion || null,
      budget_cents: params.budgetCents ?? null,
      event_date: params.eventDate || null,
    })
    .select()
    .single();
  return { data: data as SecretSantaGroup | null, error };
}

// Groups visible are already exactly right courtesy of RLS (organizer OR a
// participant of that group) -- a caller-side filter would be redundant.
export async function listMySecretSantaGroups() {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("secret_santa_groups")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SecretSantaGroup[];
}

export async function getSecretSantaGroup(groupId: string) {
  const supabase = getDb();
  const { data, error } = await supabase.from("secret_santa_groups").select("*").eq("id", groupId).maybeSingle();
  if (error) console.error("getSecretSantaGroup failed:", error.message);
  return data as SecretSantaGroup | null;
}

export async function deleteSecretSantaGroup(groupId: string) {
  const supabase = getDb();
  const { error } = await supabase.from("secret_santa_groups").delete().eq("id", groupId);
  return { error };
}

// Organizer-only view (RLS enforces this): every participant's public
// fields, never the assignment graph -- that column doesn't exist on this
// table at all.
export async function getGroupParticipants(groupId: string) {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("secret_santa_participants")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SecretSantaParticipant[];
}

// Someone needs an existing GIVIT account before they can be added -- the
// group only ever grants access to real accounts (get_my_secret_santa_recipient
// matches on user_id = auth.uid()), so silently adding an email with no
// account would create a slot nobody could ever claim or see. profiles is
// public-select (see admin-schema.sql), so this lookup works for any
// signed-in caller, not just admins.
export async function findProfileByEmail(email: string) {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .ilike("email", email.trim())
    .maybeSingle();
  if (error) console.error("findProfileByEmail failed:", error.message);
  return data as { id: string; email: string; full_name: string | null } | null;
}

export async function addSecretSantaParticipant(params: { groupId: string; email: string; name: string; userId: string }) {
  const supabase = getDb();
  const { data, error } = await supabase
    .from("secret_santa_participants")
    .insert({ group_id: params.groupId, email: params.email.trim(), name: params.name, user_id: params.userId })
    .select()
    .single();
  return { data: data as SecretSantaParticipant | null, error };
}

export async function removeSecretSantaParticipant(participantId: string) {
  const supabase = getDb();
  const { error } = await supabase.from("secret_santa_participants").delete().eq("id", participantId);
  return { error };
}

export async function getMySecretSantaParticipantRow(groupId: string, userId: string) {
  const supabase = getDb();
  const { data } = await supabase
    .from("secret_santa_participants")
    .select("*")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  return data as SecretSantaParticipant | null;
}

export async function updateMySecretSantaWishlist(participantId: string, updates: { wishlist_notes?: string; interests?: string[] }) {
  const supabase = getDb();
  const { error } = await supabase.from("secret_santa_participants").update(updates).eq("id", participantId);
  return { error };
}

// Needs 3+ participants -- enforced again server-side inside the RPC, this
// is just a fast, friendly client-side check so the button can stay
// disabled instead of round-tripping to find out.
export async function shuffleSecretSantaGroup(groupId: string) {
  const supabase = getDb();
  const { error } = await supabase.rpc("shuffle_secret_santa_group", { p_group_id: groupId });
  return { error };
}

// Returns null both when the group hasn't been shuffled yet and when the
// caller isn't a participant -- callers should already know which case
// they're in from the group's own `status` field.
export async function getMySecretSantaAssignment(groupId: string) {
  const supabase = getDb();
  const { data, error } = await supabase.rpc("get_my_secret_santa_recipient", { p_group_id: groupId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as SecretSantaRecipient | undefined) ?? null;
}
