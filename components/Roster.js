import { rosterApi } from "../api/rosterApi.js";

export class Roster {
  constructor(container) {
    console.log("[Roster] Initializing with container:", container);
    if (!container) {
      throw new Error("[Roster] Container element is required");
    }

    // Initialize container with proper structure
    this.container = container;
    this.container.classList.add("roster-root-container");
    this.container.style.height = "calc(100vh - 100px)";
    this.container.style.display = "flex";
    this.container.style.flexDirection = "column";
    this.container.style.overflow = "hidden";

    this.viewRange = 6; // months
    this.workers = ["Toti", "Tizi"];
    this.shifts = [];
    this.selectedDate = null;
    this.employees = [];
    this.modal = null;
    this.shiftMode = "day-night"; // 'day-only' or 'day-night'
    this.selectedCells = new Set(); // Store selected cell keys as 'worker|date'
    this.isSelecting = false;
    this.selectionStart = null;

    // Initialize the component
    this.initialize();
  }

  async initialize() {
    try {
      console.log("[Roster] Starting initialization");
      await this.setupUI();
      await this.loadInitialData();
      console.log("[Roster] Initialization complete");
    } catch (error) {
      console.error("[Roster] Initialization failed:", error);
      this.showError("Failed to initialize roster. Please try again.");
    }
  }

  async loadInitialData() {
    try {
      console.log("[Roster] Loading initial data");

      // Always use the current year and month for the timeline and query
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Calculate start and end dates
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + this.viewRange, 0);

      console.log("[Roster] Date range:", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        viewRange: this.viewRange,
      });

      // Check database structure first
      const structureOk = await rosterApi.checkDatabaseStructure();
      console.log("[Roster] Database structure check:", structureOk);

      // Load shifts and employees in parallel
      const [shifts, employees] = await Promise.all([
        rosterApi.getShifts(startDate, endDate),
        rosterApi.getEmployees(),
      ]);

      console.log("[Roster] Loaded shifts:", shifts);
      console.log("[Roster] Loaded employees:", employees);

      // If no employees loaded, use default workers
      this.workers =
        employees?.length > 0 ? employees.map((e) => e.name) : ["Toti", "Tizi"];
      this.shifts = shifts || [];

      // Log shift dates for debugging
      this.shifts.forEach((shift) => {
        console.log("[Roster] Shift:", {
          worker: shift.worker_name,
          date: shift.shift_date,
          type: shift.shift_type,
          is_working: shift.is_working,
        });
      });

      this.render();
    } catch (error) {
      console.error("[Roster] Error loading initial data:", error);
      this.showError("Failed to load roster data. Please try again.");
    }
  }

  async setupUI() {
    console.log("[Roster] Setting up UI");
    this.container.innerHTML = `
      <div class="roster-container" style="display: flex; flex-direction: column; height: 100%; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div class="roster-header" style="padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;">
          <h2>Staff Roster</h2>
          <div class="roster-controls" style="display: flex; gap: 10px; align-items: center;">
            <button id="prevMonth" style="padding: 8px 16px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer;">←</button>
            <button id="zoomOut" style="padding: 8px 16px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer;">-</button>
            <span id="viewRangeText">${this.viewRange} months</span>
            <button id="zoomIn" style="padding: 8px 16px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer;">+</button>
            <button id="nextMonth" style="padding: 8px 16px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer;">→</button>
          </div>
        </div>
        <div class="gantt-scroll-container" style="flex: 1; overflow: auto; position: relative; border: 1px solid #ddd; margin: 20px; border-radius: 4px;">
          <div class="gantt-content" style="display: flex; flex-direction: column; min-width: fit-content;">
            <div class="timeline" id="timeline" style="border-bottom: 1px solid #ddd; background: #f8f9fa; margin-left: 150px; position: sticky; top: 0; z-index: 2;"></div>
            <div class="roster" id="roster"></div>
          </div>
        </div>
      </div>
      <div id="shift-modal" class="modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
        <div class="modal-content" style="background: white; margin: 10% auto; padding: 20px; width: 80%; max-width: 600px; border-radius: 4px; position: relative;">
          <span class="close" style="position: absolute; right: 10px; top: 10px; font-size: 24px; cursor: pointer;">&times;</span>
          <div id="modal-body"></div>
        </div>
      </div>
    `;

    // Setup controls
    const zoomIn = this.container.querySelector("#zoomIn");
    const zoomOut = this.container.querySelector("#zoomOut");
    const prevMonth = this.container.querySelector("#prevMonth");
    const nextMonth = this.container.querySelector("#nextMonth");

    if (zoomIn) {
      zoomIn.addEventListener("click", () => {
        if (this.viewRange > 1) {
          this.viewRange--;
          this.updateView();
        }
      });
    }

    if (zoomOut) {
      zoomOut.addEventListener("click", () => {
        if (this.viewRange < 12) {
          this.viewRange++;
          this.updateView();
        }
      });
    }

    if (prevMonth) {
      prevMonth.addEventListener("click", () => {
        const today = new Date();
        today.setMonth(today.getMonth() - 1);
        this.selectedDate = today;
        this.updateView();
      });
    }

    if (nextMonth) {
      nextMonth.addEventListener("click", () => {
        const today = new Date();
        today.setMonth(today.getMonth() + 1);
        this.selectedDate = today;
        this.updateView();
      });
    }

    // Setup modal
    this.modal = this.container.querySelector("#shift-modal");
    if (this.modal) {
      const closeButton = this.modal.querySelector(".close");
      if (closeButton) {
        closeButton.addEventListener("click", () => this.closeModal());
      }
    }

    // Add shift mode toggle to header
    const header = this.container.querySelector(".roster-header");
    if (header) {
      const modeToggle = document.createElement("div");
      modeToggle.style.display = "flex";
      modeToggle.style.alignItems = "center";
      modeToggle.style.gap = "8px";
      modeToggle.style.marginLeft = "20px";
      modeToggle.innerHTML = `
        <label style="font-size:0.95em;">Shift Mode:</label>
        <select id="shiftModeSelect" style="padding:2px 8px; border-radius:3px;">
          <option value="day-night">Day & Night</option>
          <option value="day-only">Day Only</option>
        </select>
      `;
      header.appendChild(modeToggle);
      const select = modeToggle.querySelector("#shiftModeSelect");
      select.value = this.shiftMode;
      select.addEventListener("change", (e) => {
        this.shiftMode = e.target.value;
        this.loadInitialData();
      });
    }

    // Add base styles
    this.addStyles();
  }

  async updateView() {
    console.log("[Roster] Updating view to", this.viewRange, "months");
    const viewRangeText = this.container.querySelector("#viewRangeText");
    if (viewRangeText) {
      viewRangeText.textContent = `${this.viewRange} months`;
    }
    await this.loadInitialData();
  }

  render() {
    console.log("[Roster] Rendering roster");
    this.renderTimeline();
    this.renderRoster();
  }

  renderTimeline() {
    const timeline = this.container.querySelector("#timeline");
    if (!timeline) {
      console.error("[Roster] Timeline element not found");
      return;
    }
    timeline.innerHTML = "";

    // Calculate date range
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(
      today.getFullYear(),
      today.getMonth() + this.viewRange,
      0
    );

    console.log("[Roster] Rendering timeline:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
    });

    // Create timeline cells
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    timeline.style.display = "flex";
    timeline.style.minWidth = `${days * 50}px`; // 50px per day

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const cell = document.createElement("div");
      cell.className = "timeline-cell";
      cell.style.width = "50px";
      cell.style.minWidth = "50px";
      cell.style.height = "60px"; // Increased height to accommodate day name
      cell.style.borderRight = "1px solid #eee";
      cell.style.display = "flex";
      cell.style.flexDirection = "column";
      cell.style.alignItems = "center";
      cell.style.justifyContent = "center";
      cell.style.gap = "2px"; // Add gap between elements

      // Show day name
      const dayName = date.toLocaleString("default", { weekday: "short" });
      const dayLabel = document.createElement("div");
      dayLabel.textContent = dayName;
      dayLabel.style.fontSize = "0.7rem";
      dayLabel.style.color = "#666";
      cell.appendChild(dayLabel);

      // Show date number
      const dateNum = document.createElement("div");
      dateNum.textContent = date.getDate();
      dateNum.style.fontSize = "0.9rem";
      cell.appendChild(dateNum);

      // Show month on first day
      if (date.getDate() === 1 || i === 0) {
        const monthName = date.toLocaleString("default", { month: "short" });
        const monthLabel = document.createElement("div");
        monthLabel.textContent = monthName;
        monthLabel.style.fontSize = "0.7rem";
        monthLabel.style.opacity = "0.7";
        cell.appendChild(monthLabel);
      }

      // Highlight today
      if (date.toDateString() === today.toDateString()) {
        cell.style.backgroundColor = "#f0f7ff";
        cell.style.fontWeight = "bold";
      }

      // Highlight weekends
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        cell.style.backgroundColor = "#f5f5f5";
      }

      timeline.appendChild(cell);
    }
  }

  renderRoster() {
    const roster = this.container.querySelector("#roster");
    if (!roster) {
      console.error("[Roster] Roster element not found");
      return;
    }
    roster.innerHTML = "";
    roster.style.display = "flex";
    roster.style.flexDirection = "column";

    // Calculate date range for columns
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(
      today.getFullYear(),
      today.getMonth() + this.viewRange,
      0
    );
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // For shift+click
    let lastCellKey = null;

    // Create worker rows
    this.workers.forEach((worker) => {
      const row = document.createElement("div");
      row.className = "worker-row";
      row.style.display = "flex";
      row.style.minHeight = "60px";
      row.style.borderBottom = "1px solid #eee";
      row.style.position = "relative";

      // Add worker name
      const nameCell = document.createElement("div");
      nameCell.className = "worker-name";
      nameCell.textContent = worker;
      nameCell.style.width = "150px";
      nameCell.style.minWidth = "150px";
      nameCell.style.backgroundColor = "#f8f9fa";
      nameCell.style.borderRight = "1px solid #ddd";
      nameCell.style.display = "flex";
      nameCell.style.alignItems = "center";
      nameCell.style.padding = "0 10px";
      nameCell.style.fontWeight = "bold";
      nameCell.style.position = "sticky";
      nameCell.style.left = "0";
      nameCell.style.zIndex = "1";
      row.appendChild(nameCell);

      // Add shift container (grid of days)
      const shiftContainer = document.createElement("div");
      shiftContainer.className = "shift-container";
      shiftContainer.style.position = "relative";
      shiftContainer.style.flex = "1";
      shiftContainer.style.minHeight = "60px";
      shiftContainer.style.display = "flex";

      for (let i = 0; i < days; i++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(cellDate.getDate() + i);
        const cellDateStr = cellDate.toISOString().split("T")[0];
        const cellKey = `${worker}|${cellDateStr}`;

        // Find shift for this worker and date
        const shift = this.shifts.find(
          (s) => s.worker_name === worker && s.shift_date === cellDateStr
        );

        const cell = document.createElement("div");
        cell.className = "roster-grid-cell cell";
        cell.style.width = "50px";
        cell.style.minWidth = "50px";
        cell.style.height = "60px";
        cell.style.display = "flex";
        cell.style.alignItems = "center";
        cell.style.justifyContent = "center";
        cell.style.position = "relative";
        cell.style.cursor = "pointer";
        cell.style.borderRight = "1px solid #eee";
        cell.style.background = "white";
        cell.setAttribute("data-worker", worker);
        cell.setAttribute("data-date", cellDateStr);
        cell.setAttribute("data-key", cellKey);

        // Highlight weekends
        const dayOfWeek = cellDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          cell.style.background = "#f5f5f5";
        }

        // Highlight today
        if (cellDate.toDateString() === today.toDateString()) {
          cell.style.background = "#f0f7ff";
          cell.style.fontWeight = "bold";
        }

        // Highlight if selected
        if (this.selectedCells.has(cellKey)) {
          cell.style.outline = "none";
          cell.style.background = "#e3f0ff";
          cell.style.borderRadius = "8px";
          cell.style.boxShadow = "0 0 0 2px #90caff";
        }

        // Click handler for showing menu - this needs to come BEFORE selection handlers
        cell.addEventListener("click", (e) => {
          // If this is a normal click (no modifier keys and not during selection)
          if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !this.isSelecting) {
            e.stopPropagation(); // Stop event from bubbling
            e.preventDefault(); // Prevent default behavior
            this.selectedCells.clear();
            this.render();
            this.showCellMenu(worker, cellDateStr, shift, cell, e);
            return;
          }
        });

        // --- Drag-to-select logic ---
        cell.addEventListener("mousedown", (e) => {
          if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.isSelecting = true;
            this.selectionStart = cellKey;
            this.selectedCells.clear();
            this.selectedCells.add(cellKey);
          }
        });
        cell.addEventListener("mouseenter", (e) => {
          if (
            this.isSelecting &&
            (e.buttons === 1 || e.which === 1) &&
            this.selectionStart
          ) {
            this.selectRange(this.selectionStart, cellKey);
          }
        });
        cell.addEventListener("mouseup", (e) => {
          if (this.isSelecting) {
            this.isSelecting = false;
            this.render();
          }
        });
        // --- End drag-to-select logic ---

        cell.addEventListener("mouseup", () => {
          this.isSelecting = false;
        });

        // Render shift block if present
        if (shift) {
          const shiftBlock = document.createElement("div");
          shiftBlock.className = `shift ${shift.shift_type}`;
          shiftBlock.style.width = "40px";
          shiftBlock.style.height = "40px";
          shiftBlock.style.borderRadius = "4px";
          shiftBlock.style.display = "flex";
          shiftBlock.style.alignItems = "center";
          shiftBlock.style.justifyContent = "center";
          shiftBlock.style.color = "white";
          shiftBlock.style.fontSize = "0.8rem";
          shiftBlock.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
          shiftBlock.style.pointerEvents = "none"; // Let clicks go through to cell

          if (shift.is_working) {
            shiftBlock.style.backgroundColor =
              shift.shift_type === "day" ? "#4CAF50" : "#2196F3";
            shiftBlock.style.opacity = "1";
            shiftBlock.textContent = shift.shift_type === "day" ? "D" : "N";
          } else {
            shiftBlock.style.backgroundColor = "#ff9800";
            shiftBlock.style.opacity = "0.9";
            shiftBlock.textContent = "RDO";
          }
          cell.appendChild(shiftBlock);
        } else {
          const plusBtn = document.createElement("span");
          plusBtn.textContent = "+";
          plusBtn.style.color = "#bbb";
          plusBtn.style.fontSize = "1.2rem";
          plusBtn.style.opacity = "0.5";
          plusBtn.style.pointerEvents = "none";
          cell.appendChild(plusBtn);
        }

        shiftContainer.appendChild(cell);
      }
      row.appendChild(shiftContainer);
      roster.appendChild(row);
    });

    // Bulk action menu
    if (this.selectedCells.size > 0) {
      this.renderBulkActionMenu();
    }

    // Clear selection on click outside
    const clearSelectionHandler = (e) => {
      const isClickOnCell = e.target.closest(".roster-grid-cell");
      const isClickOnMenu =
        e.target.closest("#cell-menu") || e.target.closest("#bulk-action-menu");

      if (!isClickOnCell && !isClickOnMenu) {
        this.selectedCells.clear();
        this.render();
        document.removeEventListener("mousedown", clearSelectionHandler);
      }
    };
    document.addEventListener("mousedown", clearSelectionHandler);
  }

  selectRange(startKey, endKey) {
    // Select all cells between startKey and endKey (row-major order)
    const allKeys = [];
    this.workers.forEach((worker) => {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      for (let i = 0; i < this.viewRange * 31; i++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(cellDate.getDate() + i);
        const cellDateStr = cellDate.toISOString().split("T")[0];
        const cellKey = `${worker}|${cellDateStr}`;
        allKeys.push(cellKey);
      }
    });
    const startIdx = allKeys.indexOf(startKey);
    const endIdx = allKeys.indexOf(endKey);
    if (startIdx !== -1 && endIdx !== -1) {
      const [from, to] = [
        Math.min(startIdx, endIdx),
        Math.max(startIdx, endIdx),
      ];
      this.selectedCells = new Set(allKeys.slice(from, to + 1));
      this.render();
    }
  }

  renderBulkActionMenu() {
    // Remove any existing menu
    let menu = document.getElementById("bulk-action-menu");
    if (menu) menu.remove();
    if (this.selectedCells.size < 2) return;
    // Gather info about selected cells
    const selected = Array.from(this.selectedCells).map((key) => {
      const [worker, date] = key.split("|");
      const shift = this.shifts.find(
        (s) => s.worker_name === worker && s.shift_date === date
      );
      return { key, worker, date, shift };
    });
    const hasEmpty = selected.some((c) => !c.shift);
    const hasShift = selected.some((c) => c.shift);
    const hasRDO = selected.some((c) => c.shift && !c.shift.is_working);
    const hasWorking = selected.some((c) => c.shift && c.shift.is_working);
    const hasNight = selected.some(
      (c) => c.shift && c.shift.shift_type === "night"
    );
    const hasDay = selected.some(
      (c) => c.shift && c.shift.shift_type === "day"
    );

    menu = document.createElement("div");
    menu.id = "bulk-action-menu";
    menu.style.position = "fixed";
    menu.style.bottom = "30px";
    menu.style.left = "50%";
    menu.style.transform = "translateX(-50%)";
    menu.style.background = "white";
    menu.style.border = "1px solid #b3d1f7";
    menu.style.borderRadius = "10px";
    menu.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)";
    menu.style.padding = "10px 18px";
    menu.style.zIndex = "9999";
    menu.style.display = "flex";
    menu.style.gap = "12px";
    menu.style.alignItems = "center";
    menu.style.fontSize = "1.05em";

    // Counter
    const counter = document.createElement("span");
    counter.textContent = `${this.selectedCells.size} selected`;
    counter.style.fontWeight = "bold";
    counter.style.color = "#1976d2";
    menu.appendChild(counter);

    if (hasEmpty || hasShift) {
      const addDayBtn = document.createElement("button");
      addDayBtn.textContent = "Set All to Day";
      addDayBtn.style.background = "#4CAF50";
      addDayBtn.style.color = "white";
      addDayBtn.style.border = "none";
      addDayBtn.style.borderRadius = "5px";
      addDayBtn.style.padding = "6px 14px";
      addDayBtn.style.cursor = "pointer";
      addDayBtn.addEventListener("click", async () => {
        for (const c of selected) {
          if (!c.shift) {
            await rosterApi.addShift({
              worker_name: c.worker,
              shift_type: "day",
              shift_date: c.date,
              is_working: true,
              notes: "",
            });
          } else {
            await rosterApi.updateShift(c.shift.id, {
              shift_type: "day",
              is_working: true,
            });
          }
        }
        this.selectedCells.clear();
        this.loadInitialData();
      });
      menu.appendChild(addDayBtn);
      if (this.shiftMode === "day-night") {
        const addNightBtn = document.createElement("button");
        addNightBtn.textContent = "Set All to Night";
        addNightBtn.style.background = "#2196F3";
        addNightBtn.style.color = "white";
        addNightBtn.style.border = "none";
        addNightBtn.style.borderRadius = "5px";
        addNightBtn.style.padding = "6px 14px";
        addNightBtn.style.cursor = "pointer";
        addNightBtn.addEventListener("click", async () => {
          for (const c of selected) {
            if (!c.shift) {
              await rosterApi.addShift({
                worker_name: c.worker,
                shift_type: "night",
                shift_date: c.date,
                is_working: true,
                notes: "",
              });
            } else {
              await rosterApi.updateShift(c.shift.id, {
                shift_type: "night",
                is_working: true,
              });
            }
          }
          this.selectedCells.clear();
          this.loadInitialData();
        });
        menu.appendChild(addNightBtn);
      }
    }
    if (hasShift) {
      const setRdoBtn = document.createElement("button");
      setRdoBtn.textContent = "Set to RDO";
      setRdoBtn.style.background = "#ff9800";
      setRdoBtn.style.color = "white";
      setRdoBtn.style.border = "none";
      setRdoBtn.style.borderRadius = "5px";
      setRdoBtn.style.padding = "6px 14px";
      setRdoBtn.style.cursor = "pointer";
      setRdoBtn.addEventListener("click", async () => {
        for (const c of selected) {
          if (!c.shift) {
            await rosterApi.addShift({
              worker_name: c.worker,
              shift_type: "day",
              shift_date: c.date,
              is_working: false,
              notes: "",
            });
          } else {
            await rosterApi.updateShift(c.shift.id, { is_working: false });
          }
        }
        this.selectedCells.clear();
        this.loadInitialData();
      });
      menu.appendChild(setRdoBtn);

      const setWorkingBtn = document.createElement("button");
      setWorkingBtn.textContent = "Set to Working";
      setWorkingBtn.style.background = "#4CAF50";
      setWorkingBtn.style.color = "white";
      setWorkingBtn.style.border = "none";
      setWorkingBtn.style.borderRadius = "5px";
      setWorkingBtn.style.padding = "6px 14px";
      setWorkingBtn.style.cursor = "pointer";
      setWorkingBtn.addEventListener("click", async () => {
        for (const c of selected) {
          if (!c.shift) {
            await rosterApi.addShift({
              worker_name: c.worker,
              shift_type: "day",
              shift_date: c.date,
              is_working: true,
              notes: "",
            });
          } else {
            await rosterApi.updateShift(c.shift.id, { is_working: true });
          }
        }
        this.selectedCells.clear();
        this.loadInitialData();
      });
      menu.appendChild(setWorkingBtn);

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove Shift(s)";
      removeBtn.style.background = "#e74c3c";
      removeBtn.style.color = "white";
      removeBtn.style.border = "none";
      removeBtn.style.borderRadius = "5px";
      removeBtn.style.padding = "6px 14px";
      removeBtn.style.cursor = "pointer";
      removeBtn.addEventListener("click", async () => {
        for (const c of selected.filter((c) => c.shift)) {
          await rosterApi.deleteShift(c.shift.id);
        }
        this.selectedCells.clear();
        this.loadInitialData();
      });
      menu.appendChild(removeBtn);
    }
    document.body.appendChild(menu);
  }

  showCellMenu(worker, date, shift, cell, clickEvent) {
    console.log("[Roster] Creating cell menu for:", { worker, date, shift });

    // Remove any existing menus
    const oldMenu = document.getElementById("cell-menu");
    const oldBulkMenu = document.getElementById("bulk-action-menu");
    if (oldMenu) oldMenu.remove();
    if (oldBulkMenu) oldBulkMenu.remove();

    // Create menu
    const menu = document.createElement("div");
    menu.id = "cell-menu";
    menu.style.position = "fixed";
    menu.style.background = "white";
    menu.style.border = "1px solid #ccc";
    menu.style.borderRadius = "8px";
    menu.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
    menu.style.padding = "12px 16px";
    menu.style.zIndex = "99999";
    menu.style.display = "flex";
    menu.style.flexDirection = "column";
    menu.style.gap = "10px";
    menu.style.minWidth = "220px";
    menu.style.maxWidth = "300px";
    menu.style.transformOrigin = "top left";
    menu.style.transition = "opacity 0.1s ease";
    menu.style.opacity = "0";

    // Add date display at the top
    const dateDisplay = document.createElement("div");
    dateDisplay.style.borderBottom = "1px solid #eee";
    dateDisplay.style.paddingBottom = "8px";
    dateDisplay.style.marginBottom = "8px";
    dateDisplay.style.fontWeight = "bold";
    const displayDate = new Date(date);
    dateDisplay.textContent = displayDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    menu.appendChild(dateDisplay);

    // Add menu content based on whether there's a shift or not
    if (shift) {
      // Show shift info and edit options
      if (this.shiftMode === "day-night") {
        const typeRow = document.createElement("div");
        typeRow.style.display = "flex";
        typeRow.style.justifyContent = "space-between";
        typeRow.style.alignItems = "center";
        typeRow.innerHTML = `<span>Type:</span>`;
        const typeSelect = document.createElement("select");
        typeSelect.style.padding = "4px 8px";
        typeSelect.style.borderRadius = "3px";
        typeSelect.style.border = "1px solid #ddd";
        typeSelect.innerHTML = `<option value="day">Day</option><option value="night">Night</option>`;
        typeSelect.value = shift.shift_type;
        typeSelect.addEventListener("change", async () => {
          await rosterApi.updateShift(shift.id, {
            shift_type: typeSelect.value,
          });
          menu.remove();
          this.loadInitialData();
        });
        typeRow.appendChild(typeSelect);
        menu.appendChild(typeRow);
      }

      // Working toggle
      const workRow = document.createElement("div");
      workRow.style.display = "flex";
      workRow.style.justifyContent = "space-between";
      workRow.style.alignItems = "center";
      workRow.style.marginBottom = "8px";
      workRow.innerHTML = `<span>Status:</span>`;
      const workToggle = document.createElement("button");
      workToggle.textContent = shift.is_working ? "Working" : "RDO";
      workToggle.style.background = shift.is_working ? "#4CAF50" : "#ff9800";
      workToggle.style.color = "white";
      workToggle.style.border = "none";
      workToggle.style.borderRadius = "3px";
      workToggle.style.padding = "6px 16px";
      workToggle.style.fontWeight = "bold";
      workToggle.style.cursor = "pointer";
      workToggle.addEventListener("click", async () => {
        await rosterApi.updateShift(shift.id, {
          is_working: !shift.is_working,
        });
        menu.remove();
        this.loadInitialData();
      });
      workRow.appendChild(workToggle);
      menu.appendChild(workRow);

      // Notes section
      const notesSection = document.createElement("div");
      notesSection.style.marginTop = "10px";

      const notesLabel = document.createElement("label");
      notesLabel.textContent = "Notes:";
      notesLabel.style.display = "block";
      notesLabel.style.marginBottom = "4px";

      const notesInput = document.createElement("textarea");
      notesInput.value = shift.notes || "";
      notesInput.style.width = "100%";
      notesInput.style.minHeight = "60px";
      notesInput.style.padding = "8px";
      notesInput.style.borderRadius = "4px";
      notesInput.style.border = "1px solid #ddd";
      notesInput.style.resize = "vertical";
      notesInput.style.marginBottom = "8px";
      notesInput.placeholder = "Add notes about this shift...";

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Save Notes";
      saveBtn.style.background = "#007bff";
      saveBtn.style.color = "white";
      saveBtn.style.border = "none";
      saveBtn.style.borderRadius = "3px";
      saveBtn.style.padding = "6px 12px";
      saveBtn.style.cursor = "pointer";
      saveBtn.style.width = "100%";

      saveBtn.addEventListener("click", async () => {
        await rosterApi.updateShift(shift.id, { notes: notesInput.value });
        menu.remove();
        this.loadInitialData();
      });

      notesSection.appendChild(notesLabel);
      notesSection.appendChild(notesInput);
      notesSection.appendChild(saveBtn);
      menu.appendChild(notesSection);

      // Remove button
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove Shift";
      removeBtn.style.background = "#dc3545";
      removeBtn.style.color = "white";
      removeBtn.style.border = "none";
      removeBtn.style.borderRadius = "3px";
      removeBtn.style.padding = "6px 12px";
      removeBtn.style.cursor = "pointer";
      removeBtn.style.width = "100%";
      removeBtn.style.marginTop = "8px";

      removeBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to remove this shift?")) {
          await rosterApi.deleteShift(shift.id);
          menu.remove();
          this.loadInitialData();
        }
      });
      menu.appendChild(removeBtn);
    } else {
      // Add new shift options
      const addShiftSection = document.createElement("div");
      addShiftSection.style.display = "flex";
      addShiftSection.style.flexDirection = "column";
      addShiftSection.style.gap = "8px";

      if (this.shiftMode === "day-night") {
        const addDayBtn = document.createElement("button");
        addDayBtn.textContent = "Add Day Shift";
        addDayBtn.style.background = "#4CAF50";
        addDayBtn.style.color = "white";
        addDayBtn.style.border = "none";
        addDayBtn.style.borderRadius = "3px";
        addDayBtn.style.padding = "8px 16px";
        addDayBtn.style.cursor = "pointer";
        addDayBtn.addEventListener("click", async () => {
          await rosterApi.addShift({
            worker_name: worker,
            shift_type: "day",
            shift_date: date,
            is_working: true,
            notes: "",
          });
          menu.remove();
          this.loadInitialData();
        });

        const addNightBtn = document.createElement("button");
        addNightBtn.textContent = "Add Night Shift";
        addNightBtn.style.background = "#2196F3";
        addNightBtn.style.color = "white";
        addNightBtn.style.border = "none";
        addNightBtn.style.borderRadius = "3px";
        addNightBtn.style.padding = "8px 16px";
        addNightBtn.style.cursor = "pointer";
        addNightBtn.addEventListener("click", async () => {
          await rosterApi.addShift({
            worker_name: worker,
            shift_type: "night",
            shift_date: date,
            is_working: true,
            notes: "",
          });
          menu.remove();
          this.loadInitialData();
        });

        addShiftSection.appendChild(addDayBtn);
        addShiftSection.appendChild(addNightBtn);
      } else {
        const addShiftBtn = document.createElement("button");
        addShiftBtn.textContent = "Add Shift";
        addShiftBtn.style.background = "#4CAF50";
        addShiftBtn.style.color = "white";
        addShiftBtn.style.border = "none";
        addShiftBtn.style.borderRadius = "3px";
        addShiftBtn.style.padding = "8px 16px";
        addShiftBtn.style.cursor = "pointer";
        addShiftBtn.addEventListener("click", async () => {
          await rosterApi.addShift({
            worker_name: worker,
            shift_type: "day",
            shift_date: date,
            is_working: true,
            notes: "",
          });
          menu.remove();
          this.loadInitialData();
        });
        addShiftSection.appendChild(addShiftBtn);
      }

      const addRDOBtn = document.createElement("button");
      addRDOBtn.textContent = "Add RDO";
      addRDOBtn.style.background = "#ff9800";
      addRDOBtn.style.color = "white";
      addRDOBtn.style.border = "none";
      addRDOBtn.style.borderRadius = "3px";
      addRDOBtn.style.padding = "8px 16px";
      addRDOBtn.style.cursor = "pointer";
      addRDOBtn.addEventListener("click", async () => {
        await rosterApi.addShift({
          worker_name: worker,
          shift_type: "day",
          shift_date: date,
          is_working: false,
          notes: "",
        });
        menu.remove();
        this.loadInitialData();
      });

      addShiftSection.appendChild(addRDOBtn);
      menu.appendChild(addShiftSection);
    }

    // Add the menu to the document body
    document.body.appendChild(menu);

    // Position menu near the mouse click
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Get click coordinates
    const mouseX = clickEvent ? clickEvent.clientX : 0;
    const mouseY = clickEvent ? clickEvent.clientY : 0;

    // Start by positioning to the right of the mouse
    let left = mouseX + 10;
    let top = mouseY - 15;

    // If it would go off right edge of viewport, position to the left
    if (left + menuRect.width > viewportWidth - 20) {
      left = mouseX - menuRect.width - 10;
    }

    // If it would go off bottom of viewport, position above
    if (top + menuRect.height > viewportHeight - 20) {
      top = mouseY - menuRect.height - 10;
    }

    // Ensure menu stays within viewport bounds
    left = Math.max(20, Math.min(left, viewportWidth - menuRect.width - 20));
    top = Math.max(20, Math.min(top, viewportHeight - menuRect.height - 20));

    // Apply position
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    console.log("[Roster] Menu positioned at:", { left, top, mouseX, mouseY });

    // Show the menu with a fade-in effect
    setTimeout(() => {
      menu.style.opacity = "1";
    }, 10);

    // Add semi-transparent overlay
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.right = "0";
    overlay.style.bottom = "0";
    overlay.style.background = "rgba(0,0,0,0.2)";
    overlay.style.zIndex = "99998";
    document.body.appendChild(overlay);

    // Close menu on click outside
    const closeMenu = (e) => {
      const isClickOnMenu = menu.contains(e.target);
      const isClickOnCell = cell.contains(e.target);

      if (!isClickOnMenu && !isClickOnCell) {
        menu.style.opacity = "0";
        setTimeout(() => {
          menu.remove();
          overlay.remove();
        }, 100);
        document.removeEventListener("mousedown", closeMenu);
      }
    };

    document.addEventListener("mousedown", closeMenu);

    // Add hover effects to buttons
    menu.querySelectorAll("button").forEach((button) => {
      button.style.transition = "all 0.2s ease";
      button.addEventListener("mouseover", () => {
        button.style.filter = "brightness(0.9)";
        button.style.transform = "scale(1.02)";
      });
      button.addEventListener("mouseout", () => {
        button.style.filter = "brightness(1)";
        button.style.transform = "scale(1)";
      });
    });
  }

  showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    this.container.insertBefore(errorDiv, this.container.firstChild);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  openModal() {
    this.modal.style.display = "block";
  }

  closeModal() {
    this.modal.style.display = "none";
  }

  addStyles() {
    const styleId = "roster-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .roster-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .roster-header {
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #eee;
        }

        .roster-controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .gantt-scroll-container {
          flex: 1;
          overflow: auto;
          position: relative;
          border: 1px solid #ddd;
          margin: 20px;
          border-radius: 4px;
        }

        .gantt-content {
          display: flex;
          flex-direction: column;
          min-width: fit-content;
        }

        .timeline {
          display: flex;
          border-bottom: 1px solid #ddd;
          background: #f8f9fa;
          margin-left: 150px;
          position: sticky;
          top: 0;
          z-index: 2;
        }

        .timeline-cell {
          min-width: 50px;
          height: 50px;
          border-right: 1px solid #eee;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          color: #666;
          padding: 5px;
        }

        .roster {
          display: flex;
          flex-direction: column;
        }

        .worker-row {
          display: flex;
          min-height: 60px;
          border-bottom: 1px solid #eee;
          position: relative;
        }

        .worker-name {
          width: 150px;
          position: sticky;
          left: 0;
          background: #f8f9fa;
          border-right: 1px solid #ddd;
          display: flex;
          align-items: center;
          padding: 0 10px;
          font-weight: bold;
          z-index: 1;
        }

        .shift-container {
          position: relative;
          flex-grow: 1;
          min-height: 60px;
        }

        .shift {
          position: absolute;
          height: 40px;
          top: 50%;
          transform: translateY(-50%);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.8rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .shift:hover {
          transform: translateY(-50%) scale(1.05);
          z-index: 2;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .shift.day {
          background-color: #4CAF50;
        }

        .shift.night {
          background-color: #2196F3;
        }

        .shift.daily {
          opacity: 1;
        }

        .shift.hourly {
          opacity: 0.7;
        }

        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
        }

        .modal-content {
          background: white;
          margin: 10% auto;
          padding: 20px;
          width: 80%;
          max-width: 600px;
          border-radius: 4px;
          position: relative;
        }

        .close {
          position: absolute;
          right: 10px;
          top: 10px;
          font-size: 24px;
          cursor: pointer;
        }

        .error-message {
          background: #fee;
          color: #c00;
          padding: 10px;
          margin: 20px;
          border-radius: 4px;
          text-align: center;
        }

        button {
          background: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }

        button:hover {
          background: #0056b3;
        }
      `;
      document.head.appendChild(style);
    }
  }

  handleCellClick(event) {
    console.log("[Roster] Cell clicked", event);
    const cell = event.currentTarget;
    const worker = cell.dataset.worker;
    const date = cell.dataset.date;
    const shiftType = cell.dataset.shiftType;

    // Check if modifier keys are pressed (for selection)
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      // This is a selection action, not a menu action
      // Don't prevent default for selections
      return; // Let the selection handlers handle this
    }

    // For normal clicks (no modifier keys), show the menu
    event.preventDefault();
    event.stopPropagation();
    this.clearSelection(); // Clear any existing selection
    this.showCellMenu(cell, worker, date, shiftType);
  }

  setupSelectionHandlers() {
    // Reset selection state
    this.selectedCells = new Set();
    this.selectionStart = null;
    this.isSelecting = false;

    // Clear the selection when clicking outside the grid or menus
    document.addEventListener("click", (e) => {
      // Don't clear if clicking inside a cell, the cell menu, or the bulk menu
      if (
        e.target.closest(".cell") ||
        e.target.closest(".cell-menu") ||
        e.target.closest(".bulk-action-menu")
      ) {
        return;
      }

      this.clearSelection();
    });

    // Update mousedown handler
    this.container.querySelectorAll(".cell").forEach((cell) => {
      cell.addEventListener("mousedown", (e) => {
        // Only handle selection if a modifier key is pressed
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          e.preventDefault(); // Prevent text selection
          this.isSelecting = true;

          if (e.shiftKey && this.selectionStart) {
            // Shift+click: select range from last selected to current
            this.selectRange(this.selectionStart, cell);
          } else {
            // Ctrl/Cmd+click: add to selection
            this.toggleCellSelection(cell);
            this.selectionStart = cell;
          }

          this.renderBulkActionMenu();
        }
      });

      // Update other event listeners to check for selection mode
      cell.addEventListener("mouseenter", (e) => {
        if (this.isSelecting && e.buttons === 1) {
          this.toggleCellSelection(cell, true); // Force add to selection
          this.renderBulkActionMenu();
        }
      });
    });

    // Handle mouseup to end selection
    document.addEventListener("mouseup", () => {
      this.isSelecting = false;
    });
  }

  setupEventListeners() {
    // ... existing code ...

    this.container.querySelectorAll(".cell").forEach((cell) => {
      // First add the click handler for the menu
      cell.addEventListener("click", this.handleCellClick.bind(this));

      // Then setup the selection handlers
      // The selection handlers will only trigger when modifier keys are pressed
    });

    this.setupSelectionHandlers();

    // ... existing code ...
  }
}
