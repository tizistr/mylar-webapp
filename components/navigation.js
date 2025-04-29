import { dataOperations } from "../supabase.js";

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export class NavigationManager {
  constructor() {
    console.log("NavigationManager constructor called");
    this.contentArea = null;
    this.calendar = null;
    this.roster = null;
    this.timeTable = null;
    this.initialize();
  }

  initialize() {
    console.log("Initializing NavigationManager");
    this.setup();
  }

  setup() {
    console.log("Setting up NavigationManager");

    this.contentArea = document.querySelector(".content");
    if (!this.contentArea) {
      console.error("Content area not found");
      return;
    }

    // Log the initial state
    const buttons = document.querySelectorAll(".nav-button");
    console.log(`Found ${buttons.length} navigation buttons`);
    buttons.forEach((btn) => {
      console.log(`Button found: ${btn.getAttribute("data-section")}`);
    });

    this.setupEventListeners();
    console.log("Navigation manager setup complete");
  }

  setupEventListeners() {
    console.log("Setting up event listeners");

    // Handle all nav button clicks
    document.querySelectorAll(".nav-button").forEach((button) => {
      console.log(
        `Adding click listener to button: ${button.getAttribute(
          "data-section"
        )}`
      );

      // Remove any existing click listeners
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      newButton.addEventListener("click", (e) => {
        console.log(
          `Button clicked: ${newButton.getAttribute("data-section")}`
        );
        e.preventDefault();
        e.stopPropagation();

        const section = newButton.getAttribute("data-section");
        if (!section) {
          console.error("No data-section attribute found on button");
          return;
        }

        // Handle subsection toggle
        const arrow = newButton.querySelector(".nav-arrow");
        if (arrow) {
          console.log(`Found arrow in button ${section}`);
          const subsection = newButton.parentElement.querySelector(
            `.nav-subsection[data-parent="${section}"]`
          );
          if (subsection) {
            console.log(`Toggling subsection for ${section}`);
            subsection.classList.toggle("active");
            arrow.classList.toggle("active");
            return;
          }
        }

        // Handle navigation
        console.log(`Navigating to section: ${section}`);

        // Remove active class from all buttons
        document.querySelectorAll(".nav-button").forEach((btn) => {
          btn.classList.remove("active");
        });

        // Add active class to clicked button
        newButton.classList.add("active");

        // Navigate to the section
        this.handleNavigation(section);
      });
    });

    // Set up theme toggle
    const themeToggle = document.querySelector(".theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const html = document.documentElement;
        const currentTheme = html.getAttribute("data-theme");
        const newTheme = currentTheme === "light" ? "dark" : "light";
        html.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
      });
    }

    // Set up search
    const searchInput = document.querySelector(".search-input");
    const searchButton = document.querySelector(".search-button");

    if (searchInput && searchButton) {
      const handleSearch = () => {
        const query = searchInput.value.trim();
        if (query) {
          console.log("Search query:", query);
          // Implement search functionality here
        }
      };

      // Example: Debounced handler if we were searching on input
      const debouncedSearchHandler = debounce(() => {
        const query = searchInput.value.trim();
        if (query) {
          console.log("Debounced Search query:", query);
          // Implement actual search-as-you-type logic here
        }
      }, 300); // Wait 300ms after user stops typing

      if (searchInput) {
        // If you want search-as-you-type, use this:
        // searchInput.addEventListener('input', debouncedSearchHandler);

        // Keep existing Enter key listener
        searchInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            handleSearch(); // Keep immediate search on Enter
          }
        });
      }

      searchButton.addEventListener("click", handleSearch);
    }

    // Set up event listener for Time Tracking link
    const timeTrackingLink = document.querySelector("a#time-tracking-tab");
    if (timeTrackingLink) {
      timeTrackingLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.loadTimeTracking();
      });
    }

    console.log("Event listeners setup complete");
  }

  async handleNavigation(section) {
    console.log(`Handling navigation for section: ${section}`);

    try {
      // Clear previous content
      this.contentArea.innerHTML = "";

      switch (section) {
        case "roster":
        case "roster-view":
          console.log(
            "[NavigationManager] Dynamically loading and showing roster"
          );
          try {
            const container = document.createElement("div");
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.overflow = "auto";
            container.style.position = "relative";
            container.classList.add("roster-view-container");
            this.contentArea.appendChild(container);

            // Dynamic import for Roster
            const { Roster } = await import("@components/Roster.js");
            console.log("[NavigationManager] Roster module loaded");

            if (this.roster) {
              // Optionally clean up existing roster if needed
              // this.roster.destroy?.(); // If Roster class has a cleanup method
              this.roster = null;
            }

            this.roster = new Roster(container);
          } catch (error) {
            console.error(
              "[NavigationManager] Failed to load/initialize roster:",
              error
            );
            this.showError("Failed to load roster: " + error.message);
          }
          break;
        case "roster-add":
          console.log("Showing add shift");
          // Ensure Roster is loaded if needed for addShift logic
          if (!this.roster) {
            // Load roster implicitly if not already loaded
            await this.handleNavigation("roster");
            // Check if roster instance exists after loading attempt
            if (!this.roster)
              throw new Error(
                "Roster instance not available for adding shift."
              );
          }
          await this.showAddShift();
          break;
        case "roster-settings":
          console.log("Showing roster settings");
          this.showRosterSettings();
          break;
        case "time-tracking":
          console.log("[NavigationManager] Dynamically loading Time Tracking");
          await this.loadTimeTracking(); // loadTimeTracking now handles dynamic import
          break;
        case "calendar":
        case "calendar-view":
          console.log("[NavigationManager] Dynamically loading calendar");
          await this.showCalendar(); // showCalendar now handles dynamic import
          break;
        case "calendar-add":
          console.log("Showing add event");
          await this.showAddEvent();
          break;
        case "calendar-settings":
          console.log("Showing calendar settings");
          this.showCalendarSettings();
          break;
        case "projects":
          console.log("Showing projects");
          this.showProjectsContent();
          break;
        case "samples":
          console.log("Showing samples");
          this.showSamplesContent();
          break;
        case "reports":
          console.log("Showing reports");
          this.showReportsContent();
          break;
        case "analysis":
          console.log("Showing analysis tools");
          this.showAnalysisTools();
          break;
        case "export":
          console.log("Showing export tools");
          this.showExportTools();
          break;
        default:
          console.log("Showing default content");
          this.showDefaultContent();
      }
    } catch (error) {
      console.error("Navigation error:", error);
      this.showError("Failed to navigate: " + error.message);
    }
  }

  async showRoster() {
    console.log("Initializing roster view");
    try {
      const container = document.createElement("div");
      container.className = "roster-container";
      this.contentArea.appendChild(container);

      if (!this.roster) {
        this.roster = new Roster(container);
      }
    } catch (error) {
      console.error("Error showing roster:", error);
      this.showError("Failed to load roster: " + error.message);
    }
  }

  async showAddShift() {
    this.contentArea.innerHTML = `
      <div class="add-shift-form">
        <h2>Add New Shift</h2>
        <form id="shiftForm">
          <div class="form-group">
            <label for="employeeName">Employee:</label>
            <select id="employeeName" required>
              <option value="Toti">Toti</option>
              <option value="Tizi">Tizi</option>
            </select>
          </div>
          <div class="form-group">
            <label for="shiftDate">Date:</label>
            <input type="date" id="shiftDate" required>
          </div>
          <div class="form-group">
            <label for="shiftType">Shift Type:</label>
            <select id="shiftType" required>
              <option value="Day">Day Shift</option>
              <option value="Night">Night Shift</option>
              <option value="RDO">RDO (Day Off)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="notes">Notes:</label>
            <textarea id="notes"></textarea>
          </div>
          <button type="submit">Add Shift</button>
        </form>
      </div>
    `;

    document
      .getElementById("shiftForm")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = {
          worker_name: document.getElementById("employeeName").value,
          shift_date: document.getElementById("shiftDate").value,
          shift_type: document.getElementById("shiftType").value,
          notes: document.getElementById("notes").value,
        };

        try {
          // Ensure Roster is loaded if needed for addShift method
          if (!this.roster) {
            // Optionally add logic to load roster or handle error
            throw new Error("Roster component not loaded.");
          }
          await this.roster.addShift(formData);
          this.handleNavigation("roster-view"); // Navigate back to roster view
        } catch (error) {
          console.error("Error adding shift:", error);
          alert("Failed to add shift: " + error.message);
        }
      });
  }

  showRosterSettings() {
    this.contentArea.innerHTML = `
      <div class="settings-container">
        <h2>Roster Settings</h2>
        <div class="settings-group">
          <h3>Display Options</h3>
          <label>
            <input type="checkbox" id="showWeekends" checked>
            Show Weekends
          </label>
          <label>
            <input type="checkbox" id="showHolidays" checked>
            Show Public Holidays
          </label>
        </div>
        <div class="settings-group">
          <h3>Notifications</h3>
          <label>
            <input type="checkbox" id="shiftReminders">
            Shift Reminders
          </label>
          <label>
            <input type="checkbox" id="coverageAlerts">
            Coverage Alerts
          </label>
        </div>
        <button id="saveRosterSettings">Save Settings</button>
      </div>
    `;

    document
      .getElementById("saveRosterSettings")
      ?.addEventListener("click", () => {
        // Save settings logic here
        alert("Settings saved successfully!");
      });
  }

  showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.style.cssText =
      "color: red; padding: 1rem; background: #fee; border-radius: 4px; margin: 1rem 0;";
    errorDiv.textContent = message;
    this.contentArea.appendChild(errorDiv);
  }

  async showCalendar() {
    try {
      this.contentArea.innerHTML = '<div class="calendar-container"></div>';
      const container = this.contentArea.querySelector(".calendar-container");
      if (!container) throw new Error("Calendar container not found");

      // Dynamic import for Calendar
      const { Calendar } = await import("@components/Calendar.js");
      console.log("[NavigationManager] Calendar module loaded");

      if (!this.calendar) {
        this.calendar = new Calendar(container);
      } else {
        // Reuse existing instance but update container if needed
        this.calendar.container = container; // Assuming Calendar can handle container changes
      }

      await this.calendar.init(); // Assuming init() fetches data and renders
    } catch (error) {
      console.error("Error showing calendar:", error);
      this.contentArea.innerHTML = `
        <div class="error-message">
          <h2>Error Loading Calendar</h2>
          <p>There was an error loading the calendar. Please try again.</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }

  async showAddEvent() {
    // Ensure Calendar is loaded before showing modal
    if (!this.calendar) {
      console.log(
        "[NavigationManager] Loading Calendar before showing Add Event modal"
      );
      await this.showCalendar();
      // Check if calendar instance exists after loading attempt
      if (!this.calendar)
        throw new Error("Calendar instance not available for adding event.");
    }
    const today = new Date();
    // Assuming Calendar instance now exists
    await this.calendar.showEventModal(today);
  }

  showCalendarSettings() {
    this.contentArea.innerHTML = `
            <div class="content-section">
                <h2>Calendar Settings</h2>
                <div class="settings-form">
                    <div class="form-group">
                        <label>Default View</label>
                        <select id="default-view">
                            <option value="month">Month</option>
                            <option value="week">Week</option>
                            <option value="day">Day</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>First Day of Week</label>
                        <select id="first-day">
                            <option value="0">Sunday</option>
                            <option value="1">Monday</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Time Format</label>
                        <select id="time-format">
                            <option value="12">12-hour</option>
                            <option value="24">24-hour</option>
                        </select>
                    </div>
                    <button class="save-settings">Save Settings</button>
                </div>
            </div>
        `;

    // Add event listener for save settings button
    const saveButton = this.contentArea.querySelector(".save-settings");
    saveButton.addEventListener("click", () => {
      const defaultView = this.contentArea.querySelector("#default-view").value;
      const firstDay = this.contentArea.querySelector("#first-day").value;
      const timeFormat = this.contentArea.querySelector("#time-format").value;

      // Save settings to localStorage
      localStorage.setItem(
        "calendarSettings",
        JSON.stringify({
          defaultView,
          firstDay,
          timeFormat,
        })
      );

      // Show success message
      alert("Settings saved successfully!");
    });
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

  async loadTimeTracking() {
    console.log("[NavigationManager] Loading Time Tracking component");
    try {
      const container = document.createElement("div");
      container.id = "timeTableContainer";
      container.style.width = "100%";
      container.style.height = "calc(100vh - 100px)";
      container.style.overflow = "auto";
      container.style.position = "relative";

      // Clear previous content and add container
      this.contentArea.innerHTML = "";
      this.contentArea.appendChild(container);

      // Dynamic import for TimeTable
      const { TimeTable } = await import("./TimeTable.js");
      console.log("[NavigationManager] TimeTable module loaded");

      if (!this.timeTable) {
        console.log("[NavigationManager] Creating new TimeTable instance");
        this.timeTable = new TimeTable(container);
      } else {
        // Re-initialize or update existing instance
        console.log("[NavigationManager] Reusing existing TimeTable instance");
        // this.timeTable.destroy?.(); // Optional cleanup
        this.timeTable = new TimeTable(container); // Recreate or update
      }
      // Potentially call an init method if TimeTable has one
      // await this.timeTable.init?.();
    } catch (error) {
      console.error("[NavigationManager] Error loading time tracking:", error);
      this.contentArea.innerHTML = `
        <div class="error-message">
          <h2>Error Loading Time Tracking</h2>
          <p>There was an error loading the time tracking component. Please try again.</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }
}
