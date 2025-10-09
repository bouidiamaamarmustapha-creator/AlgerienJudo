import { supabase } from "./supabaseClient";

// Centralized persistence for UI configs (circle buttons, announcements)
// Uses Supabase Storage for cross-device consistency, with localStorage fallback.

const CIRCLE_BUTTONS_STORAGE_PATH = "home/circle_buttons.json";
const STORAGE_BUCKET = "publications"; // existing public bucket
const LOCAL_KEY = "algerian_judo_circle_buttons";

export async function loadCircleButtons() {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(CIRCLE_BUTTONS_STORAGE_PATH);
    if (error) throw error;
    const text = await data.text();
    const json = JSON.parse(text);
    return Array.isArray(json) ? json : [];
  } catch (err) {
    try {
      const saved = localStorage.getItem(LOCAL_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }
}

export async function saveCircleButtons(buttons) {
  // Persist to localStorage immediately for UX
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(buttons));
  } catch {}

  try {
    const blob = new Blob([JSON.stringify(buttons)], { type: "application/json" });
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(CIRCLE_BUTTONS_STORAGE_PATH, blob, { upsert: true });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Failed to save circle buttons to Supabase, kept local copy:", err?.message || err);
    return false;
  }
}