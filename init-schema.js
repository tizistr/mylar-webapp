import { supabase } from './supabase.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initSchema() {
    try {
        // Read the SQL schema file
        const schemaPath = path.join(__dirname, 'schema.sql')
        const schema = fs.readFileSync(schemaPath, 'utf8')

        // Execute the schema
        const { error } = await supabase.rpc('exec_sql', { sql: schema })
        
        if (error) throw error
        
        console.log('Database schema created successfully!')
    } catch (error) {
        console.error('Error creating database schema:', error)
    }
}

// Run the schema initialization
initSchema() 