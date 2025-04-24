import { supabase } from '../supabase.js'

export class ProjectForm {
    constructor(container) {
        this.container = container
        this.render()
    }

    render() {
        this.container.innerHTML = `
            <form class="form" id="project-form">
                <h2>Add New Project</h2>
                <div class="form-group">
                    <label for="project-name">Project Name</label>
                    <input type="text" id="project-name" required>
                </div>
                <div class="form-group">
                    <label for="project-description">Description</label>
                    <textarea id="project-description" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="project-location">Location</label>
                    <input type="text" id="project-location">
                </div>
                <div class="form-group">
                    <label for="project-start-date">Start Date</label>
                    <input type="date" id="project-start-date">
                </div>
                <div class="form-group">
                    <label for="project-end-date">End Date</label>
                    <input type="date" id="project-end-date">
                </div>
                <button type="submit" class="submit-button">Create Project</button>
            </form>
        `

        this.form = this.container.querySelector('#project-form')
        this.form.addEventListener('submit', this.handleSubmit.bind(this))
    }

    async handleSubmit(e) {
        e.preventDefault()
        
        const projectData = {
            name: this.form.querySelector('#project-name').value,
            description: this.form.querySelector('#project-description').value,
            location: this.form.querySelector('#project-location').value,
            start_date: this.form.querySelector('#project-start-date').value,
            end_date: this.form.querySelector('#project-end-date').value
        }

        try {
            const { data, error } = await supabase
                .from('projects')
                .insert([projectData])
                .select()
                .single()

            if (error) throw error

            // Dispatch custom event for project creation
            const event = new CustomEvent('projectCreated', { detail: data })
            document.dispatchEvent(event)

            // Reset form
            this.form.reset()
            
            // Show success message
            this.showMessage('Project created successfully!', 'success')
        } catch (error) {
            this.showMessage('Error creating project: ' + error.message, 'error')
        }
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div')
        messageDiv.className = `message ${type}`
        messageDiv.textContent = message
        this.container.appendChild(messageDiv)
        
        setTimeout(() => messageDiv.remove(), 3000)
    }
}

export class SampleForm {
    constructor(container, projectId) {
        this.container = container
        this.projectId = projectId
        this.render()
    }

    render() {
        this.container.innerHTML = `
            <form class="form" id="sample-form">
                <h2>Add New Sample</h2>
                <div class="form-group">
                    <label for="sample-name">Sample Name</label>
                    <input type="text" id="sample-name" required>
                </div>
                <div class="form-group">
                    <label for="sample-type">Sample Type</label>
                    <input type="text" id="sample-type" required>
                </div>
                <div class="form-group">
                    <label for="sample-location">Location</label>
                    <input type="text" id="sample-location">
                </div>
                <div class="form-group">
                    <label for="sample-collection-date">Collection Date</label>
                    <input type="date" id="sample-collection-date">
                </div>
                <div class="form-group">
                    <label for="sample-description">Description</label>
                    <textarea id="sample-description" rows="3"></textarea>
                </div>
                <button type="submit" class="submit-button">Add Sample</button>
            </form>
        `

        this.form = this.container.querySelector('#sample-form')
        this.form.addEventListener('submit', this.handleSubmit.bind(this))
    }

    async handleSubmit(e) {
        e.preventDefault()
        
        const sampleData = {
            project_id: this.projectId,
            name: this.form.querySelector('#sample-name').value,
            sample_type: this.form.querySelector('#sample-type').value,
            location: this.form.querySelector('#sample-location').value,
            collection_date: this.form.querySelector('#sample-collection-date').value,
            description: this.form.querySelector('#sample-description').value
        }

        try {
            const { data, error } = await supabase
                .from('samples')
                .insert([sampleData])
                .select()
                .single()

            if (error) throw error

            // Dispatch custom event for sample creation
            const event = new CustomEvent('sampleCreated', { detail: data })
            document.dispatchEvent(event)

            // Reset form
            this.form.reset()
            
            // Show success message
            this.showMessage('Sample added successfully!', 'success')
        } catch (error) {
            this.showMessage('Error adding sample: ' + error.message, 'error')
        }
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div')
        messageDiv.className = `message ${type}`
        messageDiv.textContent = message
        this.container.appendChild(messageDiv)
        
        setTimeout(() => messageDiv.remove(), 3000)
    }
} 