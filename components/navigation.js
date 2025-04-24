export class NavigationManager {
    constructor() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.contentArea = document.querySelector('.content');
        if (!this.contentArea) {
            console.error('Content area not found');
            return;
        }
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Handle all nav button clicks
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const section = button.getAttribute('data-section');
                
                if (section) {
                    this.handleNavigation(section);
                }
            });
        });

        // Handle nav section toggles
        document.querySelectorAll('.nav-arrow').forEach(arrow => {
            arrow.addEventListener('click', (e) => {
                e.stopPropagation();
                const button = arrow.closest('.nav-button');
                if (!button) return;
                
                const section = button.getAttribute('data-section');
                if (!section) return;
                
                const subsection = document.querySelector(`.nav-subsection[data-parent="${section}"]`);
                if (subsection) {
                    subsection.classList.toggle('active');
                    arrow.classList.toggle('active');
                }
            });
        });
    }

    handleNavigation(section) {
        // Clear previous content
        this.contentArea.innerHTML = '';

        switch (section) {
            case 'projects':
                this.showProjectsContent();
                break;
            case 'project-1':
                this.showProjectContent('Alpine Metamorphism');
                break;
            case 'samples':
                this.showSamplesContent();
                break;
            case 'sample-1':
                this.showSampleContent('Sample A-001');
                break;
            case 'thin-sections':
                this.showThinSectionsContent();
                break;
            case 'xrd':
                this.showXRDAnalysis();
                break;
            case 'chemical':
                this.showChemicalAnalysis();
                break;
            case 'reports':
                this.showReportsContent();
                break;
            case 'recent':
                this.showRecentContent();
                break;
            case 'favorites':
                this.showFavoritesContent();
                break;
            case 'analysis':
                this.showAnalysisTools();
                break;
            case 'export':
                this.showExportTools();
                break;
            default:
                this.showDefaultContent();
        }
    }

    showDefaultContent() {
        this.contentArea.innerHTML = `
            <div class="content-placeholder">
                <h1>Welcome to Mylar</h1>
                <p>Select an item from the sidebar to view its contents.</p>
            </div>
        `;
    }

    showProjectsContent() {
        this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>Projects</h2>
                <div class="project-list">
                    <div class="project-card">
                        <h3>Alpine Metamorphism</h3>
                        <p>Study of metamorphic rocks in the Alpine region</p>
                    </div>
                </div>
            </div>
        `;
    }

    showProjectContent(projectName) {
        this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>${projectName}</h2>
                <div class="project-details">
                    <p>Location: Alpine Region</p>
                    <p>Status: Active</p>
                    <p>Start Date: 2024-01-01</p>
                </div>
            </div>
        `;
    }

    showSamplesContent() {
        this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>Samples</h2>
                <div class="sample-list">
                    <div class="sample-card">
                        <h3>Sample A-001</h3>
                        <p>Type: Metamorphic Rock</p>
                        <p>Location: Alpine Region</p>
                    </div>
                </div>
            </div>
        `;
    }

    showSampleContent(sampleName) {
        this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>${sampleName}</h2>
                <div class="sample-details">
                    <p>Type: Metamorphic Rock</p>
                    <p>Location: Alpine Region</p>
                    <p>Collection Date: 2024-01-15</p>
                </div>
            </div>
        `;
    }

    showThinSectionsContent() {
        this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>Thin Sections</h2>
                <div class="image-gallery">
                    <div class="image-card">
                        <img src="images/Thin section 1.jpg" alt="Thin Section">
                        <p>Sample A-001 Thin Section</p>
                    </div>
                </div>
            </div>
        `;
    }

    showXRDAnalysis() {
        this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>XRD Analysis</h2>
                <div class="analysis-content">
                    <canvas id="xrd-chart"></canvas>
                </div>
            </div>
        `;
    }

    showChemicalAnalysis() {
        this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>Chemical Analysis</h2>
                <div class="analysis-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Element</th>
                                <th>Concentration (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>SiO2</td>
                                <td>45.2</td>
                            </tr>
                            <tr>
                                <td>Al2O3</td>
                                <td>12.8</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    showReportsContent() {
        this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>Reports</h2>
                <div class="report-list">
                    <div class="report-card">
                        <h3>Initial Analysis Report</h3>
                        <p>Date: 2024-01-20</p>
                        <p>Status: Completed</p>
                    </div>
                </div>
            </div>
        `;
    }

    showRecentContent() {
        this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>Recent Items</h2>
                <div class="recent-list">
                    <div class="recent-item">
                        <i class="ti ti-file-text"></i>
                        <span>Initial Analysis Report</span>
                    </div>
                </div>
            </div>
        `;
    }

    showFavoritesContent() {
        this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>Favorites</h2>
                <div class="favorites-list">
                    <div class="favorite-item">
                        <i class="ti ti-star"></i>
                        <span>Sample A-001</span>
                    </div>
                </div>
            </div>
        `;
    }

    showAnalysisTools() {
        this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>Analysis Tools</h2>
                <div class="tools-grid">
                    <button class="tool-button">
                        <i class="ti ti-chart-bar"></i>
                        <span>XRD Analysis</span>
                    </button>
                    <button class="tool-button">
                        <i class="ti ti-flask"></i>
                        <span>Chemical Analysis</span>
                    </button>
                </div>
            </div>
        `;
    }

    showExportTools() {
        this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>Export Data</h2>
                <div class="export-options">
                    <button class="export-button">
                        <i class="ti ti-file-export"></i>
                        <span>Export as CSV</span>
                    </button>
                    <button class="export-button">
                        <i class="ti ti-file-download"></i>
                        <span>Export as PDF</span>
                    </button>
                </div>
            </div>
        `;
    }
} 