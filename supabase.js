import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase client with your project URL and anon key
// You'll need to replace these with your actual Supabase project credentials
const supabaseUrl = "https://mzlxlrqpxuahjtnojvdq.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bHhscnFweHVhaGp0bm9qdmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MTM5MTYsImV4cCI6MjA2MDk4OTkxNn0.GRiL2zYSBMhR3UuCaLmT_OHg5MKJmUr_AUjPoUUO6j4";

// Initialize and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Database table names
export const tables = {
  projects: "projects",
  samples: "samples",
  thin_sections: "thin_sections",
  xrd_analyses: "xrd_analyses",
  chemical_analyses: "chemical_analyses",
  reports: "reports",
  events: "events",
};

// --- Caching Configuration ---
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// --- Caching Helper Functions ---
function getCachedData(key) {
  try {
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) {
      console.log(`[Cache] Miss for key: ${key}`);
      return null;
    }

    const { timestamp, data } = JSON.parse(cachedItem);
    const isExpired = Date.now() - timestamp > CACHE_DURATION_MS;

    if (isExpired) {
      console.log(`[Cache] Expired for key: ${key}`);
      localStorage.removeItem(key); // Remove expired item
      return null;
    }

    console.log(`[Cache] Hit for key: ${key}`);
    return data;
  } catch (error) {
    console.error(`[Cache] Error reading cache for key ${key}:`, error);
    localStorage.removeItem(key); // Remove corrupted item
    return null;
  }
}

function setCachedData(key, data) {
  try {
    const itemToCache = {
      timestamp: Date.now(),
      data: data,
    };
    localStorage.setItem(key, JSON.stringify(itemToCache));
    console.log(`[Cache] Set data for key: ${key}`);
  } catch (error) {
    console.error(`[Cache] Error setting cache for key ${key}:`, error);
    // Handle potential storage quota errors if necessary
  }
}

function invalidateCache(key) {
  try {
    console.log(`[Cache] Invalidating key: ${key}`);
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[Cache] Error removing cache for key ${key}:`, error);
  }
}

// Data operations for all features
export const dataOperations = {
  // Projects
  async getProjects() {
    const cacheKey = "supabase_cache_projects";
    const cachedData = getCachedData(cacheKey);
    if (cachedData) return { data: cachedData, error: null };

    console.log("[API] Getting projects from Supabase");
    const { data, error } = await supabase
      .from(tables.projects)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    setCachedData(cacheKey, data);
    return { data, error: null };
  },

  async addProject(project) {
    console.log("[API] Adding project", project);
    const { data, error } = await supabase
      .from(tables.projects)
      .insert(project)
      .select()
      .single();
    if (error) throw error;
    invalidateCache("supabase_cache_projects"); // Invalidate cache on add
    return { data, error: null };
  },

  // Samples
  async getSamples(projectId) {
    const cacheKey = `supabase_cache_samples_${projectId}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) return { data: cachedData, error: null };

    console.log("[API] Getting samples for project", projectId);
    const { data, error } = await supabase
      .from(tables.samples)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    setCachedData(cacheKey, data);
    return { data, error: null };
  },

  async addSample(sample) {
    console.log("[API] Adding sample", sample);
    const { data, error } = await supabase
      .from(tables.samples)
      .insert(sample)
      .select()
      .single();
    if (error) throw error;
    // Invalidate specific project's sample cache
    invalidateCache(`supabase_cache_samples_${sample.project_id}`);
    // Potentially invalidate related project data if needed
    return { data, error: null };
  },

  // Events
  async getEvents() {
    const cacheKey = "supabase_cache_events";
    const cachedData = getCachedData(cacheKey);
    if (cachedData) return { data: cachedData, error: null };

    console.log("[API] Getting events from Supabase");
    const { data, error } = await supabase
      .from(tables.events)
      .select("*")
      .order("date", { ascending: true });
    if (error) throw error;
    setCachedData(cacheKey, data);
    return { data, error: null };
  },

  async addEvent(event) {
    console.log("[API] Adding event", event);
    const { data, error } = await supabase
      .from(tables.events)
      .insert(event)
      .select()
      .single();
    if (error) throw error;
    invalidateCache("supabase_cache_events");
    return { data, error: null };
  },

  async deleteEvent(eventId) {
    console.log("[API] Deleting event", eventId);
    const { error } = await supabase
      .from(tables.events)
      .delete()
      .eq("id", eventId);
    if (error) throw error;
    invalidateCache("supabase_cache_events");
    return { data: null, error: null };
  },

  // Reports
  async getReports(projectId) {
    console.log("Getting reports for project", projectId);
    const { data, error } = await supabase
      .from(tables.reports)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { data, error: null };
  },

  // Analyses
  async getAnalyses(sampleId, type) {
    console.log(`Getting ${type} analyses for sample`, sampleId);
    const table =
      type === "xrd" ? tables.xrd_analyses : tables.chemical_analyses;
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("sample_id", sampleId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { data, error: null };
  },
};
