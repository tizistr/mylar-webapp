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

// Data operations for all features
export const dataOperations = {
  // Projects
  async getProjects() {
    console.log("Getting projects");
    const { data, error } = await supabase
      .from(tables.projects)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { data, error: null };
  },

  async addProject(project) {
    console.log("Adding project", project);
    const { data, error } = await supabase
      .from(tables.projects)
      .insert(project)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  },

  // Samples
  async getSamples(projectId) {
    console.log("Getting samples for project", projectId);
    const { data, error } = await supabase
      .from(tables.samples)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { data, error: null };
  },

  async addSample(sample) {
    console.log("Adding sample", sample);
    const { data, error } = await supabase
      .from(tables.samples)
      .insert(sample)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  },

  // Events
  async getEvents() {
    console.log("Getting events");
    const { data, error } = await supabase
      .from(tables.events)
      .select("*")
      .order("date", { ascending: true });
    if (error) throw error;
    return { data, error: null };
  },

  async addEvent(event) {
    console.log("Adding event", event);
    const { data, error } = await supabase
      .from(tables.events)
      .insert(event)
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  },

  async deleteEvent(eventId) {
    console.log("Deleting event", eventId);
    const { error } = await supabase
      .from(tables.events)
      .delete()
      .eq("id", eventId);
    if (error) throw error;
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
