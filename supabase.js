import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mzlxlrqpxuahjtnojvdq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bHhscnFweHVhaGp0bm9qdmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MTM5MTYsImV4cCI6MjA2MDk4OTkxNn0.GRiL2zYSBMhR3UuCaLmT_OHg5MKJmUr_AUjPoUUO6j4'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database schema types
export const tables = {
    projects: 'projects',
    samples: 'samples',
    thin_sections: 'thin_sections',
    xrd_analyses: 'xrd_analyses',
    chemical_analyses: 'chemical_analyses',
    reports: 'reports'
}

// Helper functions for data operations
export const dataOperations = {
    // Projects
    async getProjects() {
        const { data, error } = await supabase
            .from(tables.projects)
            .select('*')
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    // Samples
    async getSamples(projectId) {
        const { data, error } = await supabase
            .from(tables.samples)
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    // Thin Sections
    async getThinSections(sampleId) {
        const { data, error } = await supabase
            .from(tables.thin_sections)
            .select('*')
            .eq('sample_id', sampleId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    // XRD Analyses
    async getXRDAnalyses(sampleId) {
        const { data, error } = await supabase
            .from(tables.xrd_analyses)
            .select('*')
            .eq('sample_id', sampleId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    // Chemical Analyses
    async getChemicalAnalyses(sampleId) {
        const { data, error } = await supabase
            .from(tables.chemical_analyses)
            .select('*')
            .eq('sample_id', sampleId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    },

    // Reports
    async getReports(projectId) {
        const { data, error } = await supabase
            .from(tables.reports)
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return data
    }
} 