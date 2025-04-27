import { rosterApi } from "../api/rosterApi.js";
import { supabase } from "../supabase.js";

export class TimeTable {
  constructor(container) {
    console.log("[TimeTable] Initializing with container:", container);
    if (!container) {
      throw new Error("[TimeTable] Container element is required");
    }

    // Initialize container
    this.container = container;
    this.container.classList.add("timetable-root-container");
    this.container.style.height = "calc(100vh - 100px)";
    this.container.style.display = "flex";
    this.container.style.flexDirection = "column";
    this.container.style.overflow = "hidden";

    // Set properties
    this.timeLogs = [];
    this.projects = [];
    this.currentWorker = null;
    this.dateRange = {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), // Last day of current month
    };
    this.employees = [];
    this.modal = null;
    this.editingLogId = null;

    // Initialize the component
    this.initialize();
  }

  async initialize() {
    try {
      console.log("[TimeTable] Starting initialization");
      await this.setupUI();
      await this.loadInitialData();
      console.log("[TimeTable] Initialization complete");
    } catch (error) {
      console.error("[TimeTable] Initialization failed:", error);
      this.showError("Failed to initialize time table. Please try again.");
    }
  }

  async loadInitialData() {
    try {
      console.log("[TimeTable] Loading initial data");

      // Load employees
      this.employees = await rosterApi.getEmployees();
      this.currentWorker = this.employees[0].name;

      // Load projects for dropdown
      this.projects = await rosterApi.getProjects();

      // Load time logs for current worker and date range
      await this.loadTimeLogs();

      this.render();
    } catch (error) {
      console.error("[TimeTable] Error loading initial data:", error);
      this.showError("Failed to load time table data. Please try again.");
    }
  }

  async loadTimeLogs() {
    try {
      console.log("[TimeTable] Loading time logs");

      // Check if table exists first
      const tableExists = await this.checkTimeLogsTableExists();
      if (!tableExists) {
        console.warn("[TimeTable] time_logs table does not exist yet");
        document.getElementById("timeTableWarning").textContent =
          "Time tracking is not set up yet. Please use the controls above to add your first time log.";
        document.getElementById("timeTableWarning").style.display = "block";
        return;
      }

      // Format date range for the current view
      const formattedStartDate = this.dateRange.start
        .toISOString()
        .split("T")[0];
      const formattedEndDate = this.dateRange.end.toISOString().split("T")[0];

      console.log(
        `[TimeTable] Loading time logs for range: ${formattedStartDate} to ${formattedEndDate}`
      );

      // Clear any previous warnings
      document.getElementById("timeTableWarning").style.display = "none";

      // Show loading state
      document.getElementById("timeLogsTable").classList.add("loading");

      // Find worker ID that matches the current worker name
      const workerObj = this.employees.find(
        (emp) => emp.name === this.currentWorker
      );
      const workerId = workerObj ? workerObj.id : null;

      // Get time logs using the rosterApi method
      const { data: logs, error } = await rosterApi.getTimeLogs({
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        workerName: this.currentWorker,
      });

      // Hide loading state
      document.getElementById("timeLogsTable").classList.remove("loading");

      if (error) {
        console.error("[TimeTable] Error loading time logs:", error);
        document.getElementById("timeTableWarning").textContent =
          "Failed to load time logs. Please try refreshing the page.";
        document.getElementById("timeTableWarning").style.display = "block";
        return;
      }

      console.log("[TimeTable] Loaded time logs:", logs);
      this.timeLogs = logs || [];
      this.renderTimeLogs();
    } catch (error) {
      console.error("[TimeTable] Error in loadTimeLogs:", error);
      alert(
        "Error loading time logs: " + (error.message || JSON.stringify(error))
      );
      document.getElementById("timeTableWarning").textContent =
        "An error occurred while loading time logs. Please try again later.";
      document.getElementById("timeTableWarning").style.display = "block";
      document.getElementById("timeLogsTable").classList.remove("loading");
    }
  }

  async setupUI() {
    console.log("[TimeTable] Setting up UI");
    this.container.innerHTML = `
      <div class="timetable-container" style="display: flex; flex-direction: column; height: 100%; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div id="timeTableWarning" style="display:none; color: #dc3545; padding: 10px; font-weight: bold;"></div>
        <div class="timetable-header" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;">
          <h2>Time Tracking</h2>
          <div class="timetable-controls" style="display: flex; gap: 10px; align-items: center;">
            <button id="prevMonth" style="padding: 8px 16px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer;">←</button>
            <span id="dateRangeText"></span>
            <button id="nextMonth" style="padding: 8px 16px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer;">→</button>
            <select id="workerSelect" style="padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px;"></select>
          </div>
        </div>
        <div class="timetable-top-actions" style="padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;">
          <div>
            <button id="addLogBtn" style="padding: 10px 20px; border: none; border-radius: 4px; background: #28a745; color: white; cursor: pointer;">+ Add Time Log</button>
          </div>
          <div>
            <span id="totalHours" style="font-weight: bold; margin-right: 20px;"></span>
            <button id="exportBtn" style="padding: 8px 16px; border: none; border-radius: 4px; background: #6c757d; color: white; cursor: pointer;">Export</button>
            <button id="fixTableBtn" style="padding: 8px 16px; border: none; border-radius: 4px; background: #dc3545; color: white; cursor: pointer; margin-left: 8px;">Verify DB</button>
          </div>
        </div>
        <div class="timetable-content" style="flex: 1; overflow: auto; padding: 20px;">
          <div id="timeTableWarning" style="display:none; color: #dc3545; padding: 10px; font-weight: bold;"></div>
          <table id="timeLogsTable" style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Hours</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Project</th>
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Activity Description</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Actions</th>
              </tr>
            </thead>
            <tbody id="timeLogsTableBody"></tbody>
          </table>
        </div>
      </div>
      <div id="time-log-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div class="modal-content" style="background: white; margin: 10% auto; padding: 20px; width: 80%; max-width: 600px; border-radius: 4px; position: relative;">
          <span class="close" style="position: absolute; right: 10px; top: 10px; font-size: 24px; cursor: pointer;">&times;</span>
          <h3 id="modalTitle">Add Time Log</h3>
          <form id="timeLogForm" style="margin-top: 20px;">
            <div style="margin-bottom: 15px;">
              <label for="logDate" style="display: block; margin-bottom: 5px;">Date:</label>
              <input type="date" id="logDate" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
              <label for="hoursWorked" style="display: block; margin-bottom: 5px;">Hours Worked:</label>
              <select id="hoursWorked" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                ${Array.from({ length: 49 }, (_, i) => {
                  const val = (i * 0.5).toFixed(1);
                  return `<option value="${val}">${val}</option>`;
                }).join("")}
              </select>
            </div>
            <div style="margin-bottom: 15px;">
              <label for="projectSelect" style="display: block; margin-bottom: 5px;">Project:</label>
              <select id="projectSelect" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></select>
            </div>
            <div style="margin-bottom: 15px;">
              <label for="activityDescription" style="display: block; margin-bottom: 5px;">Activity Description:</label>
              <textarea id="activityDescription" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 80px;"></textarea>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
              <button type="button" id="cancelBtn" style="padding: 8px 16px; border: none; border-radius: 4px; background: #6c757d; color: white; cursor: pointer;">Cancel</button>
              <button type="submit" id="saveBtn" style="padding: 8px 16px; border: none; border-radius: 4px; background: #28a745; color: white; cursor: pointer;">Save</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Setup worker select
    const workerSelect = this.container.querySelector("#workerSelect");
    if (workerSelect) {
      workerSelect.innerHTML = this.employees
        .map(
          (employee) =>
            `<option value="${employee.name}">${employee.name}</option>`
        )
        .join("");
      workerSelect.addEventListener("change", () => {
        this.currentWorker = workerSelect.value;
        this.loadTimeLogs().then(() => this.render());
      });
    }

    // Setup date navigation
    const prevMonthBtn = this.container.querySelector("#prevMonth");
    const nextMonthBtn = this.container.querySelector("#nextMonth");

    if (prevMonthBtn) {
      prevMonthBtn.addEventListener("click", () => {
        const start = new Date(this.dateRange.start);
        start.setMonth(start.getMonth() - 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        this.dateRange = { start, end };
        this.loadTimeLogs().then(() => this.render());
      });
    }

    if (nextMonthBtn) {
      nextMonthBtn.addEventListener("click", () => {
        const start = new Date(this.dateRange.start);
        start.setMonth(start.getMonth() + 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        this.dateRange = { start, end };
        this.loadTimeLogs().then(() => this.render());
      });
    }

    // Setup add log button
    const addLogBtn = this.container.querySelector("#addLogBtn");
    if (addLogBtn) {
      addLogBtn.addEventListener("click", () => {
        this.showAddLogModal();
      });
    }

    // Setup export button
    const exportBtn = this.container.querySelector("#exportBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.exportTimeLogs();
      });
    }

    // Setup fix table button
    const fixTableBtn = this.container.querySelector("#fixTableBtn");
    if (fixTableBtn) {
      fixTableBtn.addEventListener("click", async () => {
        try {
          fixTableBtn.textContent = "Verifying...";
          fixTableBtn.disabled = true;

          await this.verifyDatabase();

          fixTableBtn.textContent = "Done!";
          setTimeout(() => {
            fixTableBtn.textContent = "Verify DB";
            fixTableBtn.disabled = false;
          }, 2000);

          // Reload data
          this.loadInitialData();
        } catch (error) {
          console.error("[TimeTable] Error verifying time_logs table:", error);
          this.showError(
            "Failed to verify time_logs table. Check console for details."
          );
          fixTableBtn.textContent = "Error";
          setTimeout(() => {
            fixTableBtn.textContent = "Verify DB";
            fixTableBtn.disabled = false;
          }, 2000);
        }
      });
    }

    // Setup modal
    this.modal = this.container.querySelector("#time-log-modal");
    const closeModalBtn = this.modal.querySelector(".close");
    const cancelBtn = this.modal.querySelector("#cancelBtn");
    const form = this.modal.querySelector("#timeLogForm");

    closeModalBtn.addEventListener("click", () => {
      this.hideModal();
    });

    cancelBtn.addEventListener("click", () => {
      this.hideModal();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveTimeLog();
    });

    window.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.hideModal();
      }
    });

    // Add styles
    this.addStyles();
  }

  render() {
    console.log("[TimeTable] Rendering time table");
    this.updateDateRangeText();
    this.renderTimeLogs();
    this.updateTotalHours();
  }

  updateDateRangeText() {
    const dateRangeText = this.container.querySelector("#dateRangeText");
    if (dateRangeText) {
      const startMonth = this.dateRange.start.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      dateRangeText.textContent = startMonth;
    }
  }

  renderTimeLogs() {
    const tableBody = this.container.querySelector("#timeLogsTableBody");
    if (!tableBody) return;

    if (!this.timeLogs || this.timeLogs.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="padding: 20px; text-align: center; color: #666;">
            No time logs found for the selected period.
          </td>
        </tr>
      `;
      document.getElementById("timeTableWarning").style.display = "none";
      return;
    }

    tableBody.innerHTML = this.timeLogs
      .map((log) => {
        const logDate = new Date(log.log_date).toLocaleDateString();
        const projectName =
          log.project && log.project.name
            ? log.project.name
            : "Unknown Project";
        const hoursWorked = log.hours_worked || log.hours || 0;

        return `
          <tr data-id="${log.id}" style="border-bottom: 1px solid #ddd;">
            <td style="padding: 12px;">${logDate}</td>
            <td style="padding: 12px;">${hoursWorked}</td>
            <td style="padding: 12px;">${projectName}</td>
            <td style="padding: 12px;">${log.activity_description || ""}</td>
            <td style="padding: 12px; text-align: center;">
              <button class="edit-btn" data-id="${
                log.id
              }" style="margin-right: 8px; padding: 4px 8px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer;">Edit</button>
              <button class="delete-btn" data-id="${
                log.id
              }" style="padding: 4px 8px; border: none; border-radius: 4px; background: #dc3545; color: white; cursor: pointer;">Delete</button>
            </td>
          </tr>
        `;
      })
      .join("");

    // Add event listeners for edit and delete buttons
    const editButtons = tableBody.querySelectorAll(".edit-btn");
    const deleteButtons = tableBody.querySelectorAll(".delete-btn");

    editButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const logId = e.target.dataset.id;
        this.editTimeLog(logId);
      });
    });

    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const logId = e.target.dataset.id;
        this.deleteTimeLog(logId);
      });
    });

    // Update total hours
    this.updateTotalHours();
  }

  getStatusColor(status) {
    switch (status) {
      case "pending":
        return "#ffc107";
      case "approved":
        return "#28a745";
      case "rejected":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  }

  updateTotalHours() {
    const totalHoursElem = this.container.querySelector("#totalHours");
    if (totalHoursElem && this.timeLogs && this.timeLogs.length > 0) {
      const totalHours = this.timeLogs.reduce(
        (total, log) => total + parseFloat(log.hours_worked || log.hours || 0),
        0
      );
      totalHoursElem.textContent = `Total Hours: ${totalHours.toFixed(2)}`;
    } else if (totalHoursElem) {
      totalHoursElem.textContent = "Total Hours: 0.00";
    }
  }

  showAddLogModal() {
    console.log("[TimeTable] Showing add log modal");
    this.editingLogId = null;
    const modalTitle = this.modal.querySelector("#modalTitle");
    if (modalTitle) {
      modalTitle.textContent = "Add Time Log";
    }

    // Reset form
    const form = this.modal.querySelector("#timeLogForm");
    if (form) {
      form.reset();
    }

    // Set today's date
    const logDateInput = this.modal.querySelector("#logDate");
    if (logDateInput) {
      const today = new Date();
      logDateInput.value = today.toISOString().split("T")[0];
    }

    // Populate project select
    const projectSelect = this.modal.querySelector("#projectSelect");
    if (projectSelect) {
      projectSelect.innerHTML = this.projects
        .map(
          (project) => `<option value="${project.id}">${project.name}</option>`
        )
        .join("");
    }

    this.modal.style.display = "block";
  }

  async editTimeLog(logId) {
    console.log("[TimeTable] Editing time log:", logId);
    this.editingLogId = logId;
    const log = this.timeLogs.find((l) => l.id === logId);
    if (!log) return;

    const modalTitle = this.modal.querySelector("#modalTitle");
    if (modalTitle) {
      modalTitle.textContent = "Edit Time Log";
    }

    // Populate form with log data
    const logDateInput = this.modal.querySelector("#logDate");
    const hoursWorkedInput = this.modal.querySelector("#hoursWorked");
    const projectSelect = this.modal.querySelector("#projectSelect");
    const activityDescriptionInput = this.modal.querySelector(
      "#activityDescription"
    );

    if (logDateInput) {
      logDateInput.value = log.log_date;
    }

    if (hoursWorkedInput) {
      hoursWorkedInput.value = log.hours_worked || log.hours || 0;
    }

    if (projectSelect) {
      projectSelect.innerHTML = this.projects
        .map(
          (project) =>
            `<option value="${project.id}" ${
              project.id === log.project_id ? "selected" : ""
            }>${project.name}</option>`
        )
        .join("");
    }

    if (activityDescriptionInput) {
      activityDescriptionInput.value = log.activity_description;
    }

    this.modal.style.display = "block";
  }

  async deleteTimeLog(logId) {
    if (confirm("Are you sure you want to delete this time log?")) {
      try {
        await rosterApi.deleteTimeLog(logId);
        await this.loadTimeLogs();
        this.render();
        this.showSuccess("Time log deleted successfully");
      } catch (error) {
        console.error("[TimeTable] Error deleting time log:", error);
        this.showError("Failed to delete time log. Please try again.");
      }
    }
  }

  async saveTimeLog() {
    try {
      const formData = this.getFormData();
      if (!formData) return;

      this.showLoadingIndicator(true);

      // Ensure the time_logs table exists before trying to save
      const tableExists = await this.checkTimeLogsTableExists();
      if (!tableExists) {
        const created = await this.verifyDatabase();
        if (!created) {
          this.showMessage(
            "Cannot save time log because the time_logs table doesn't exist",
            "error"
          );
          this.showLoadingIndicator(false);
          return;
        }
      }

      console.log("[TimeTable] Saving time log:", formData);

      let result;
      if (this.editingLogId) {
        result = await rosterApi.updateTimeLog(this.editingLogId, formData);
      } else {
        result = await rosterApi.addTimeLog(formData);
      }

      if (result.error) {
        throw new Error(result.error.message || "Failed to save time log");
      }

      this.showMessage(
        `Time log ${this.editingLogId ? "updated" : "added"} successfully!`,
        "success"
      );
      this.hideModal();
      this.loadTimeLogs(); // Refresh the data
    } catch (error) {
      console.error("[TimeTable] Error saving time log:", error);
      this.showMessage(
        `Error: ${error.message || "Failed to save time log"}`,
        "error"
      );
    } finally {
      this.showLoadingIndicator(false);
    }
  }

  hideModal() {
    this.modal.style.display = "none";
  }

  exportTimeLogs() {
    // Convert logs to CSV
    const headers = ["Date", "Hours", "Project", "Activity"];
    const rows = this.timeLogs.map((log) => {
      const logDate = new Date(log.log_date).toLocaleDateString();
      const projectName = log.project ? log.project.name : "Unknown Project";

      return [logDate, log.hours_worked, projectName, log.activity_description];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((row) => row.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `time_logs_${this.currentWorker}_${this.dateRange.start
        .toISOString()
        .slice(0, 7)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    errorDiv.style.position = "fixed";
    errorDiv.style.top = "20px";
    errorDiv.style.right = "20px";
    errorDiv.style.padding = "12px 20px";
    errorDiv.style.backgroundColor = "#f8d7da";
    errorDiv.style.color = "#721c24";
    errorDiv.style.borderRadius = "4px";
    errorDiv.style.zIndex = "9999";
    errorDiv.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  showSuccess(message) {
    const successDiv = document.createElement("div");
    successDiv.className = "success-message";
    successDiv.textContent = message;
    successDiv.style.position = "fixed";
    successDiv.style.top = "20px";
    successDiv.style.right = "20px";
    successDiv.style.padding = "12px 20px";
    successDiv.style.backgroundColor = "#d4edda";
    successDiv.style.color = "#155724";
    successDiv.style.borderRadius = "4px";
    successDiv.style.zIndex = "9999";
    successDiv.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
    document.body.appendChild(successDiv);

    setTimeout(() => {
      successDiv.remove();
    }, 5000);
  }

  addStyles() {
    const styleId = "timetable-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .timetable-root-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        
        .timetable-content table {
          border-collapse: collapse;
          width: 100%;
        }
        
        .timetable-content th, .timetable-content td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        
        .timetable-content tr:hover {
          background-color: #f5f5f5;
        }
        
        .timetable-content th {
          background-color: #f8f9fa;
          border-bottom: 2px solid #ddd;
        }
        
        button {
          cursor: pointer;
          border: none;
          border-radius: 4px;
          padding: 8px 16px;
        }
        
        button:hover {
          opacity: 0.9;
        }
        
        .modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.5);
        }
        
        .modal-content {
          background-color: white;
          margin: 10% auto;
          padding: 20px;
          width: 80%;
          max-width: 600px;
          border-radius: 4px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .close {
          float: right;
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
        }
        
        .close:hover {
          color: #999;
        }
        
        input, select, textarea {
          width: 100%;
          padding: 8px;
          margin-bottom: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
      `;
      document.head.appendChild(style);
    }
  }

  async verifyDatabase() {
    try {
      console.log("[TimeTable] Verifying database schema");
      const tableExists = await this.checkTimeLogsTableExists();

      if (!tableExists) {
        console.log(
          "[TimeTable] time_logs table does not exist, creating it now"
        );

        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS time_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            worker_name TEXT NOT NULL,
            log_date DATE NOT NULL,
            hours_worked NUMERIC NOT NULL CHECK (hours_worked > 0 AND hours_worked <= 24),
            project_id UUID REFERENCES projects(id),
            activity_description TEXT,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

          -- Disable RLS for testing
          ALTER TABLE time_logs DISABLE ROW LEVEL SECURITY;
        `;

        // Execute the SQL directly in Supabase
        const { error: createError } = await supabase.rpc("exec_sql", {
          sql: createTableSQL,
        });

        if (createError) {
          console.error(
            "[TimeTable] Failed to create time_logs table:",
            createError
          );
          this.showError(
            "Failed to set up time tracking. Please try again or contact support."
          );
          return false;
        }

        console.log("[TimeTable] Successfully created time_logs table");
        return true;
      }

      console.log("[TimeTable] time_logs table exists");
      return true;
    } catch (error) {
      console.error("[TimeTable] Error verifying database:", error);
      this.showError(
        "Failed to verify database structure. Please try again or contact support."
      );
      return false;
    }
  }

  async checkTimeLogsTableExists() {
    try {
      // Try to select from the time_logs table
      const { data, error } = await supabase
        .from("time_logs")
        .select("id")
        .limit(1);

      // If we get a "relation does not exist" error, the table doesn't exist
      if (error && error.code === "42P01") {
        return false;
      }

      // If we get any other error, log it but assume the table exists
      if (error) {
        console.error("[TimeTable] Error checking time_logs table:", error);
        return true;
      }

      return true;
    } catch (error) {
      console.error("[TimeTable] Error in checkTimeLogsTableExists:", error);
      return false;
    }
  }

  showLoadingIndicator(show) {
    const loadingIndicator = this.container.querySelector(".loading-indicator");
    if (loadingIndicator) {
      loadingIndicator.style.display = show ? "block" : "none";
    }
  }

  showMessage(message, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.position = "fixed";
    messageDiv.style.top = "20px";
    messageDiv.style.right = "20px";
    messageDiv.style.padding = "12px 20px";
    messageDiv.style.borderRadius = "4px";
    messageDiv.style.zIndex = "9999";
    messageDiv.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
    document.body.appendChild(messageDiv);

    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }

  getFormData() {
    const logDate = this.modal.querySelector("#logDate").value;
    const hoursWorked = this.modal.querySelector("#hoursWorked").value;
    const projectId = this.modal.querySelector("#projectSelect").value;
    const description = this.modal.querySelector("#activityDescription").value;

    if (!logDate || !hoursWorked || !projectId || !description) {
      this.showError("Please fill in all required fields");
      return null;
    }

    return {
      worker_name: this.currentWorker,
      project_id: projectId,
      log_date: logDate,
      hours_worked: parseFloat(hoursWorked),
      activity_description: description,
    };
  }
}
