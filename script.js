import { supabase, dataOperations } from "./supabase.js";
import { NavigationManager } from "./components/navigation.js";
import { Roster } from "./components/Roster.js";
import { TimeTable } from "./components/TimeTable.js";

// Initialize navigation manager
const navigationManager = new NavigationManager();

// Initialize components
let roster = null;
let timeTable = null;

// Load initial data
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const projects = await dataOperations.getProjects();
    updateProjectsList(projects);

    // Initialize Roster when tab is activated
    const rosterTab = document.getElementById("roster-tab");
    if (rosterTab) {
      rosterTab.addEventListener("shown.bs.tab", () => {
        if (!roster) {
          const rosterContainer = document.getElementById("rosterContainer");
          if (rosterContainer) {
            roster = new Roster(rosterContainer);
          }
        }
      });
    }

    // Initialize TimeTable when tab is activated
    const timeTrackingTab = document.getElementById("time-tracking-tab");
    if (timeTrackingTab) {
      timeTrackingTab.addEventListener("shown.bs.tab", () => {
        if (!timeTable) {
          const timeTableContainer =
            document.getElementById("timeTableContainer");
          if (timeTableContainer) {
            timeTable = new TimeTable(timeTableContainer);
          }
        }
      });
    }
  } catch (error) {
    console.error("Error loading projects:", error);
    showError("Failed to load projects");
  }
});

// Helper function to update projects list
function updateProjectsList(projects) {
  const projectsList = document.querySelector(".projects-list");
  if (projectsList) {
    projectsList.innerHTML = projects
      .map(
        (project) => `
            <div class="project-item">
                <h3>${project.name}</h3>
                <p>${project.description || ""}</p>
            </div>
        `
      )
      .join("");
  }
}

// Helper function to show error messages
function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

// Theme toggle handling
const themeToggle = document.querySelector(".theme-toggle");
const html = document.documentElement;

// Check for saved theme preference
const savedTheme = localStorage.getItem("theme") || "light";
html.dataset.theme = savedTheme;

themeToggle.addEventListener("click", () => {
  const newTheme = html.dataset.theme === "light" ? "dark" : "light";
  html.dataset.theme = newTheme;
  localStorage.setItem("theme", newTheme);
});
