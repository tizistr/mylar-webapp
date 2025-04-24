import { supabase } from '../supabase.js'

export class ImageUploader {
    constructor(container, sampleId) {
        this.container = container
        this.sampleId = sampleId
        this.render()
    }

    render() {
        this.container.innerHTML = `
            <div class="image-uploader">
                <h2>Upload Thin Section Image</h2>
                <div class="upload-area" id="upload-area">
                    <i class="ti ti-upload"></i>
                    <p>Drag and drop an image here or click to select</p>
                    <input type="file" id="image-input" accept="image/*" style="display: none;">
                </div>
                <div class="preview-container" id="preview-container" style="display: none;">
                    <img id="image-preview" src="" alt="Preview">
                    <button class="remove-button" id="remove-image">
                        <i class="ti ti-x"></i>
                    </button>
                </div>
                <div class="upload-progress" id="upload-progress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress" id="progress"></div>
                    </div>
                    <span class="progress-text">Uploading...</span>
                </div>
            </div>
        `

        this.setupEventListeners()
    }

    setupEventListeners() {
        const uploadArea = this.container.querySelector('#upload-area')
        const imageInput = this.container.querySelector('#image-input')
        const previewContainer = this.container.querySelector('#preview-container')
        const imagePreview = this.container.querySelector('#image-preview')
        const removeButton = this.container.querySelector('#remove-image')
        const uploadProgress = this.container.querySelector('#upload-progress')
        const progress = this.container.querySelector('#progress')

        // Handle drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault()
            uploadArea.classList.add('dragover')
        })

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover')
        })

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault()
            uploadArea.classList.remove('dragover')
            const file = e.dataTransfer.files[0]
            if (file) this.handleFile(file)
        })

        // Handle click to select
        uploadArea.addEventListener('click', () => {
            imageInput.click()
        })

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0]
            if (file) this.handleFile(file)
        })

        // Handle remove image
        removeButton.addEventListener('click', () => {
            imageInput.value = ''
            previewContainer.style.display = 'none'
            uploadArea.style.display = 'flex'
        })

        // Handle file
        this.handleFile = async (file) => {
            if (!file.type.startsWith('image/')) {
                this.showMessage('Please upload an image file', 'error')
                return
            }

            // Show preview
            const reader = new FileReader()
            reader.onload = (e) => {
                imagePreview.src = e.target.result
                previewContainer.style.display = 'block'
                uploadArea.style.display = 'none'
            }
            reader.readAsDataURL(file)

            // Upload to Supabase Storage
            try {
                uploadProgress.style.display = 'block'
                
                const { data, error } = await supabase.storage
                    .from('thin-sections')
                    .upload(`${this.sampleId}/${file.name}`, file, {
                        cacheControl: '3600',
                        upsert: false,
                        onUploadProgress: (progressEvent) => {
                            const percentCompleted = Math.round(
                                (progressEvent.loaded * 100) / progressEvent.total
                            )
                            progress.style.width = `${percentCompleted}%`
                        }
                    })

                if (error) throw error

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('thin-sections')
                    .getPublicUrl(`${this.sampleId}/${file.name}`)

                // Update thin section record
                const { error: updateError } = await supabase
                    .from('thin_sections')
                    .update({ image_url: publicUrl })
                    .eq('sample_id', this.sampleId)

                if (updateError) throw updateError

                this.showMessage('Image uploaded successfully!', 'success')
            } catch (error) {
                this.showMessage('Error uploading image: ' + error.message, 'error')
            } finally {
                uploadProgress.style.display = 'none'
            }
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

export class DataVisualizer {
    constructor(container, data, type) {
        this.container = container
        this.data = data
        this.type = type
        this.render()
    }

    render() {
        switch (this.type) {
            case 'xrd':
                this.renderXRDDiagram()
                break
            case 'chemical':
                this.renderChemicalAnalysis()
                break
            default:
                this.container.innerHTML = '<p>Unsupported visualization type</p>'
        }
    }

    renderXRDDiagram() {
        // Create a canvas for the XRD diagram
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = 400
        this.container.appendChild(canvas)

        const ctx = canvas.getContext('2d')
        
        // Draw axes
        ctx.beginPath()
        ctx.moveTo(50, 350)
        ctx.lineTo(750, 350)
        ctx.moveTo(50, 50)
        ctx.lineTo(50, 350)
        ctx.strokeStyle = '#000'
        ctx.stroke()

        // Draw peaks
        if (this.data.peaks) {
            this.data.peaks.forEach(peak => {
                const x = 50 + (peak.angle / 90) * 700
                const y = 350 - (peak.intensity / 100) * 300
                
                ctx.beginPath()
                ctx.moveTo(x, 350)
                ctx.lineTo(x, y)
                ctx.strokeStyle = '#ff0000'
                ctx.stroke()
            })
        }
    }

    renderChemicalAnalysis() {
        // Create a table for chemical analysis results
        const table = document.createElement('table')
        table.className = 'chemical-analysis-table'
        
        const thead = document.createElement('thead')
        thead.innerHTML = `
            <tr>
                <th>Element</th>
                <th>Concentration (%)</th>
            </tr>
        `
        
        const tbody = document.createElement('tbody')
        if (this.data.results) {
            Object.entries(this.data.results).forEach(([element, concentration]) => {
                const tr = document.createElement('tr')
                tr.innerHTML = `
                    <td>${element}</td>
                    <td>${concentration}</td>
                `
                tbody.appendChild(tr)
            })
        }
        
        table.appendChild(thead)
        table.appendChild(tbody)
        this.container.appendChild(table)
    }
} 