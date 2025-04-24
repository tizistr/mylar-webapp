import { supabase, dataOperations } from './supabase.js';
import { NavigationManager } from './components/navigation.js';

// Navigation handling
document.addEventListener('DOMContentLoaded', async () => {
    const navButtons = document.querySelectorAll('.nav-button');
    const contentArea = document.querySelector('.content');

    // Load initial data
    try {
        const projects = await dataOperations.getProjects();
        updateProjectsList(projects);
    } catch (error) {
        console.error('Error loading projects:', error);
        showError('Failed to load projects');
    }

    // Handle navigation button clicks
    navButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            // Toggle active state
            button.classList.toggle('active');
            
            // Toggle subsection visibility
            const sectionId = button.getAttribute('data-section');
            const subsection = document.querySelector(`.nav-subsection[data-parent="${sectionId}"]`);
            if (subsection) {
                subsection.classList.toggle('active');
            }

            // Update content area based on section
            try {
                await updateContent(sectionId);
            } catch (error) {
                console.error(`Error loading content for ${sectionId}:`, error);
                showError(`Failed to load ${sectionId} content`);
            }
        });
    });

    // Function to update projects list
    function updateProjectsList(projects) {
        const projectsSection = document.querySelector('.nav-subsection[data-parent="projects"]');
        if (!projectsSection) return;

        projectsSection.innerHTML = projects.map(project => `
            <div class="nav-item">
                <button class="nav-button" data-section="project-${project.id}">
                    <i class="ti ti-folder-filled"></i>
                    <span>${project.name}</span>
                    <i class="ti ti-chevron-down nav-arrow"></i>
                </button>
                <div class="nav-subsection" data-parent="project-${project.id}">
                    <!-- Samples will be loaded dynamically -->
                </div>
            </div>
        `).join('');
    }

    // Function to update content area
    async function updateContent(sectionId) {
        const contentPlaceholder = document.querySelector('.content-placeholder');
        if (!contentPlaceholder) return;

        if (sectionId.startsWith('project-')) {
            const projectId = sectionId.split('-')[1];
            const samples = await dataOperations.getSamples(projectId);
            updateSamplesList(projectId, samples);
            contentPlaceholder.innerHTML = `
                <h1>${getSectionTitle(sectionId)}</h1>
                <div class="samples-list">
                    ${samples.map(sample => `
                        <div class="sample-card">
                            <h3>${sample.name}</h3>
                            <p>${sample.description || 'No description available'}</p>
                            <p>Type: ${sample.sample_type || 'Unknown'}</p>
                            <p>Location: ${sample.location || 'Unknown'}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            contentPlaceholder.innerHTML = `
                <h1>${getSectionTitle(sectionId)}</h1>
                <p>Loading content for ${sectionId}...</p>
            `;
        }
    }

    // Function to update samples list
    function updateSamplesList(projectId, samples) {
        const projectSection = document.querySelector(`.nav-subsection[data-parent="project-${projectId}"]`);
        if (!projectSection) return;

        const samplesButton = projectSection.querySelector('.nav-button[data-section="samples"]');
        if (!samplesButton) return;

        const samplesSubsection = projectSection.querySelector('.nav-subsection[data-parent="samples"]');
        if (!samplesSubsection) return;

        samplesSubsection.innerHTML = samples.map(sample => `
            <div class="nav-item">
                <button class="nav-button" data-section="sample-${sample.id}">
                    <i class="ti ti-rock"></i>
                    <span>${sample.name}</span>
                    <i class="ti ti-chevron-down nav-arrow"></i>
                </button>
                <div class="nav-subsection" data-parent="sample-${sample.id}">
                    <button class="nav-button" data-section="thin-sections-${sample.id}">
                        <i class="ti ti-microscope"></i>
                        <span>Thin Sections</span>
                    </button>
                    <button class="nav-button" data-section="xrd-${sample.id}">
                        <i class="ti ti-chart-bar"></i>
                        <span>XRD Analysis</span>
                    </button>
                    <button class="nav-button" data-section="chemical-${sample.id}">
                        <i class="ti ti-flask"></i>
                        <span>Chemical Analysis</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Helper function to get section titles
    function getSectionTitle(sectionId) {
        const button = document.querySelector(`.nav-button[data-section="${sectionId}"]`);
        return button ? button.querySelector('span').textContent : 'Section';
    }

    // Helper function to show errors
    function showError(message) {
        const contentPlaceholder = document.querySelector('.content-placeholder');
        if (contentPlaceholder) {
            contentPlaceholder.innerHTML = `
                <div class="error-message">
                    <i class="ti ti-alert-circle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // Initialize navigation
    new NavigationManager();
});

// Theme toggle handling
const themeToggle = document.querySelector('.theme-toggle');
const html = document.documentElement;

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme') || 'light';
html.dataset.theme = savedTheme;

themeToggle.addEventListener('click', () => {
    const newTheme = html.dataset.theme === 'light' ? 'dark' : 'light';
    html.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
}); 