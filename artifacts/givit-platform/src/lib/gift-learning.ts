/**
 * AI Learning persistence - saves to both localStorage and Supabase
 * so learning persists across devices
 */
import { createClient } from "@/lib/supabase/client";

const LOCAL_KEY = "givit-ai-learning-profile";

type LearningProfile = {
  productWeights: Record<string, number>;
  tagWeights: Record<string, number>;
};

function getDefaultProfile(): LearningProfile {
  return { productWeights: {}, tagWeights: {} };
}

function readLocal(): LearningProfile {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : getDefaultProfile();
  } catch {
    return getDefaultProfile();
  }
}

function writeLocal(profile: LearningProfile) {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(profile));
}

export async function readLearningProfile(): Promise<LearningProfile> {
  // Start with local
  const local = readLocal();
  
  // Try to merge with Supabase data if user is logged in
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return local;

    const { data: records } = await supabase
      .from("ai_learning")
      .select("*")
      .eq("user_id", user.id);

    if (records && records.length > 0) {
      for (const record of records) {
        local.productWeights[record.product_slug] = (local.productWeights[record.product_slug] ?? 0) + record.weight;
        const tags = Array.isArray(record.metadata?.tags) ? record.metadata.tags : [];
        for (const tag of tags) {
          if (record.feedback === "positive") {
            local.tagWeights[tag] = (local.tagWeights[tag] ?? 0) + 0.25;
          } else if (record.feedback === "negative") {
            local.tagWeights[tag] = (local.tagWeights[tag] ?? 0) - 0.25;
          }
        }
      }
      writeLocal(local);
    }
  } catch {
    // Offline or not logged in, just use local
  }
  
  return local;
}

export async function applyFeedback(results: { slug: string; learning_tags?: string[]; gift_tags: string[] }[], satisfied: boolean) {
  const profile = readLocal();
  const direction = satisfied ? 1 : -1;
  const feedbackType = satisfied ? "positive" : "negative";

  for (const result of results) {
    profile.productWeights[result.slug] = Math.max(-3, Math.min(3, (profile.productWeights[result.slug] ?? 0) + direction * 0.5));
    const tags = result.learning_tags ?? result.gift_tags ?? [];
    for (const tag of tags) {
      profile.tagWeights[tag] = Math.max(-3, Math.min(3, (profile.tagWeights[tag] ?? 0) + direction * 0.25));
    }
  }
  
  writeLocal(profile);

  // Persist to Supabase if logged in
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const result of results) {
      const tags = result.learning_tags ?? result.gift_tags ?? [];
      await supabase.from("ai_learning").upsert({
        user_id: user.id,
        product_slug: result.slug,
        weight: profile.productWeights[result.slug],
        feedback: feedbackType,
        metadata: { tags, updated_at: new Date().toISOString() },
      }, { onConflict: "user_id, product_slug" });
    }
  } catch {
    // Silently fail - local is always available
  }
}