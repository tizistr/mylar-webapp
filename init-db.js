import { supabase } from './supabase.js'

async function initDatabase() {
    try {
        // Create a test project
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert([
                {
                    name: 'Alpine Metamorphism Study',
                    description: 'Study of metamorphic rocks in the Alpine region',
                    location: 'Swiss Alps',
                    start_date: '2024-01-01',
                    end_date: '2024-12-31'
                }
            ])
            .select()
            .single()

        if (projectError) throw projectError

        // Create a test sample
        const { data: sample, error: sampleError } = await supabase
            .from('samples')
            .insert([
                {
                    project_id: project.id,
                    name: 'Sample A-001',
                    sample_type: 'Metamorphic Rock',
                    collection_date: '2024-01-15',
                    location: '46.5°N, 8.0°E',
                    description: 'Gneiss sample from central Swiss Alps'
                }
            ])
            .select()
            .single()

        if (sampleError) throw sampleError

        // Create a test thin section
        const { data: thinSection, error: thinSectionError } = await supabase
            .from('thin_sections')
            .insert([
                {
                    sample_id: sample.id,
                    name: 'TS-001',
                    description: 'Cross-polarized light view',
                    image_url: './images/Thin section 1.jpg',
                    mineral_composition: {
                        quartz: '40%',
                        feldspar: '35%',
                        biotite: '15%',
                        garnet: '10%'
                    },
                    texture_description: 'Foliated texture with garnet porphyroblasts'
                }
            ])
            .select()
            .single()

        if (thinSectionError) throw thinSectionError

        console.log('Database initialized successfully!')
        console.log('Project:', project)
        console.log('Sample:', sample)
        console.log('Thin Section:', thinSection)

    } catch (error) {
        console.error('Error initializing database:', error)
    }
}

// Run the initialization
initDatabase() 