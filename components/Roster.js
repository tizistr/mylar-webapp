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
    this.viewRange = 2; // Start with 2 months
    this.viewStartDate = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ); // Start of current month
    this.workers = ["Toti", "Tizi"];
    this.allShifts = []; // Store all fetched shifts
    this.shifts = []; // Shifts currently in view
    this.fetchedRange = { start: null, end: null }; // Track fetched range
    this.selectedDate = null; // Keep if needed for other features, but not for view control
    this.employees = [];
    this.modal = null;
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

  async loadInitialData(forceFetch = false) {
    try {
      console.log(
        `[Roster] loadInitialData called. Current viewStartDate: ${this.viewStartDate.toISOString()}`
      );

      // Define desired fetch range around the current view start date
      const fetchLookBehindMonths = 6;
      const fetchLookAheadMonths = 12; // Fetch a year ahead initially
      const fetchStartDate = new Date(this.viewStartDate);
      fetchStartDate.setMonth(
        fetchStartDate.getMonth() - fetchLookBehindMonths
      );
      fetchStartDate.setDate(1); // Start of month

      const fetchEndDate = new Date(this.viewStartDate);
      fetchEndDate.setMonth(fetchEndDate.getMonth() + fetchLookAheadMonths);
      fetchEndDate.setDate(0); // End of month

      // Check if cache covers the needed *fetch* range (wider than view range)
      const needsFetch =
        forceFetch ||
        !this.fetchedRange.start ||
        !this.fetchedRange.end ||
        fetchStartDate < this.fetchedRange.start ||
        fetchEndDate > this.fetchedRange.end;

      if (needsFetch) {
        console.log(
          `[Roster] Fetch needed. Fetching shifts for range: ${fetchStartDate.toISOString()} to ${fetchEndDate.toISOString()}`
        );
        this.container.classList.add("loading"); // Add loading indicator class

        // Fetch employees only if needed (e.g., first time)
        const fetchEmployees = this.workers.length <= 2; // Simple check, improve if needed
        const promises = [rosterApi.getShifts(fetchStartDate, fetchEndDate)];
        if (fetchEmployees) {
          promises.push(rosterApi.getEmployees());
        }

        const results = await Promise.all(promises);
        const apiShifts = results[0];
        const employees = fetchEmployees ? results[1] : this.employees; // Use existing if not fetched

        console.log("[Roster] API Loaded shifts:", apiShifts);
        this.allShifts = apiShifts || []; // Store all fetched shifts
        this.workers =
          employees?.length > 0
            ? employees.map((e) => e.name)
            : ["Toti", "Tizi"];
        this.fetchedRange = { start: fetchStartDate, end: fetchEndDate }; // Update cached range
        console.log(
          `[Roster] Updated fetchedRange: ${this.fetchedRange.start.toISOString()} to ${this.fetchedRange.end.toISOString()}`
        );

        this.container.classList.remove("loading"); // Remove loading indicator
      } else {
        console.log("[Roster] Fetch not needed, cached range covers request.");
      }

      // Always filter and render based on the current view settings
      this.filterAndRender();
    } catch (error) {
      console.error("[Roster] Error loading initial data:", error);
      this.showError("Failed to load roster data. Please try again.");
      this.container.classList.remove("loading");
    }
  }

  // New function to filter and render based on current view
  filterAndRender() {
    console.log(
      `[Roster] Filtering and Rendering for view start: ${this.viewStartDate.toISOString()}, range: ${
        this.viewRange
      } months`
    );

    // Ensure viewStartDate is the start of a month for consistency
    this.viewStartDate.setDate(1);

    // Calculate current view end date based on viewStartDate and viewRange
    const currentViewEndDate = new Date(this.viewStartDate);
    currentViewEndDate.setMonth(currentViewEndDate.getMonth() + this.viewRange);
    currentViewEndDate.setDate(0); // Last day of the month prior to the target month + viewRange

    const viewStartStr = this.viewStartDate.toISOString().split("T")[0];
    const viewEndStr = currentViewEndDate.toISOString().split("T")[0];

    // Filter the stored shifts based on the current view window
    this.shifts = this.allShifts.filter((shift) => {
      return shift.shift_date >= viewStartStr && shift.shift_date <= viewEndStr;
    });

    console.log(
      `[Roster] Filtered ${this.shifts.length} shifts for current view.`
    );

    // Now render the timeline and roster with the filtered shifts
    this.render();
  }

  async setupUI() {
    console.log("[Roster] Setting up UI");
    this.container.innerHTML = `
      <div class="roster-container">
        <div class="roster-header">
          <h2>Staff Roster</h2>
        </div>
        <div class="gantt-scroll-container">
          <div class="gantt-content" style="position: relative;">
            <div class="timeline" id="timeline"></div>
            <div class="roster" id="roster"></div>
          </div>
        </div>
        <div class="loading-overlay">Loading...</div>
      </div>
      <div id="shift-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close">&times;</span>
          <div id="modal-body"></div>
        </div>
      </div>
    `;

    // Setup controls - Removed Zoom listeners

    // Setup modal
    this.modal = this.container.querySelector("#shift-modal");
    this.modal
      ?.querySelector(".close")
      ?.addEventListener("click", () => this.closeModal());

    this.updateViewControls(); // Call even without span to update other potential elements
    this.addStyles();

    this.isLoadingMore = false; // Initialize flag here, used by load more button
  }

  updateViewControls() {
    // Can update other controls here if needed in the future
    // console.log("[Roster] Updating view controls - current range:", this.viewRange);
  }

  render() {
    console.log("[Roster] Rendering roster");
    document.getElementById("cell-context-menu")?.remove();
    document.getElementById("bulk-action-menu")?.remove();
    this.renderTimeline();
    this.renderRoster();
  }

  renderTimeline() {
    const timeline = this.container.querySelector("#timeline");
    if (!timeline) return;
    timeline.innerHTML = "";

    const startDate = new Date(this.viewStartDate);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + this.viewRange);
    endDate.setDate(0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(
      `[Roster] Rendering timeline from ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    let currentDate = new Date(startDate);
    const dayElements = [];

    while (currentDate <= endDate) {
      const date = new Date(currentDate);
      date.setHours(0, 0, 0, 0);

      const cell = document.createElement("div");
      cell.className = "timeline-cell";
      cell.style.width = "50px";
      cell.style.minWidth = "50px";
      cell.style.height = "60px";
      cell.style.borderRight = "1px solid #ddd";
      cell.style.display = "flex";
      cell.style.flexDirection = "column";
      cell.style.alignItems = "center";
      cell.style.justifyContent = "center";
      cell.style.gap = "2px";

      const dayName = date.toLocaleString("default", { weekday: "short" });
      const dayLabel = document.createElement("div");
      dayLabel.textContent = dayName;
      dayLabel.style.fontSize = "0.7rem";
      dayLabel.style.color = "#666";
      cell.appendChild(dayLabel);

      const dateNum = document.createElement("div");
      dateNum.textContent = date.getDate();
      dateNum.style.fontSize = "0.9rem";
      cell.appendChild(dateNum);

      if (date.getDate() === 1 || currentDate.getDate() === 1) {
        const monthName = date.toLocaleString("default", { month: "short" });
        const monthLabel = document.createElement("div");
        monthLabel.textContent = monthName;
        monthLabel.style.fontSize = "0.7rem";
        monthLabel.style.opacity = "0.7";
        cell.appendChild(monthLabel);
      }

      if (date.getTime() === today.getTime()) {
        cell.style.backgroundColor = "#f0f7ff";
        cell.style.fontWeight = "bold";
        cell.classList.add("today");
      }

      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        cell.style.backgroundColor = "#f5f5f5";
        cell.classList.add("weekend");
      }

      timeline.appendChild(cell);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    timeline.append(...dayElements);
    timeline.style.minWidth = `${dayElements.length * 50}px`;
  }

  renderRoster() {
    const roster = this.container.querySelector("#roster");
    if (!roster) return;
    roster.innerHTML = "";
    roster.style.display = "flex";
    roster.style.flexDirection = "column";

    const startDate = new Date(this.viewStartDate);
    startDate.setDate(1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + this.viewRange);
    endDate.setDate(0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateMap = new Map();
    let tempDate = new Date(startDate);
    while (tempDate <= endDate) {
      dateMap.set(tempDate.toISOString().split("T")[0], new Date(tempDate));
      tempDate.setDate(tempDate.getDate() + 1);
    }
    const dateStringsInView = Array.from(dateMap.keys());

    this.workers.forEach((worker) => {
      const row = document.createElement("div");
      row.className = "worker-row";
      row.style.display = "flex";
      row.style.minHeight = "60px";
      row.style.borderBottom = "1px solid #eee";
      row.style.position = "relative";

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

      const shiftContainer = document.createElement("div");
      shiftContainer.className = "shift-container";
      shiftContainer.style.position = "relative";
      shiftContainer.style.flex = "1";
      shiftContainer.style.minHeight = "60px";
      shiftContainer.style.display = "flex";

      dateStringsInView.forEach((cellDateStr) => {
        const cellDate = dateMap.get(cellDateStr);
        const cellKey = `${worker}|${cellDateStr}`;

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
        cell.style.overflow = "hidden";
        cell.setAttribute("data-worker", worker);
        cell.setAttribute("data-date", cellDateStr);
        cell.setAttribute("data-key", cellKey);

        const dayOfWeek = cellDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          cell.style.background = "#f5f5f5";
          cell.classList.add("weekend");
        }

        if (cellDate.getTime() === today.getTime()) {
          cell.style.background = "#f0f7ff";
          cell.style.fontWeight = "bold";
          cell.classList.add("today");
        }

        if (this.selectedCells.has(cellKey)) {
          cell.style.outline = "none";
          cell.style.background = "#e3f0ff";
          cell.style.borderRadius = "8px";
          cell.style.boxShadow = "0 0 0 2px #90caff";
        }

        let isDragging = false;
        let startX, startY, startTime;

        cell.addEventListener("mousedown", (e) => {
          if (e.button !== 0) return;

          console.log(
            `[Roster] mousedown on cell: ${cellKey}, isSelecting: ${this.isSelecting}`
          );

          if (e.ctrlKey || e.metaKey) {
            console.log("[Roster] mousedown with Ctrl/Meta");
            this.selectedCells.add(cellKey);
            this.render();
            this.renderBulkActionMenu();
            return;
          }
          if (e.shiftKey && this.selectionStart) {
            console.log("[Roster] mousedown with Shift");
            e.preventDefault();
            this.selectRange(this.selectionStart, cellKey);
            this.renderBulkActionMenu();
            return;
          }

          e.preventDefault();
          isDragging = false;
          startX = e.clientX;
          startY = e.clientY;
          startTime = Date.now();
          this.isSelecting = true;
          this.selectionStart = cellKey;

          this.selectedCells.clear();
          this.selectedCells.add(cellKey);
          this.render();

          console.log(
            `[Roster] Tentatively selected: ${cellKey}, isSelecting: ${this.isSelecting}`
          );

          const tempMouseMove = (moveEvent) => {
            if (
              !isDragging &&
              (Math.abs(moveEvent.clientX - startX) > 5 ||
                Math.abs(moveEvent.clientY - startY) > 5)
            ) {
              console.log(`[Roster] Drag detected on cell: ${cellKey}`);
              isDragging = true;
            }
            if (isDragging) {
              const startWorker = this.selectionStart?.split("|")[0];
              const currentCell = moveEvent.target.closest(".roster-grid-cell");
              if (currentCell && startWorker) {
                const currentKey = currentCell.dataset.key;
                const currentWorker = currentCell.dataset.worker;
                if (currentKey && currentWorker === startWorker) {
                  this.selectRange(this.selectionStart, currentKey);
                }
              }
            }
          };

          const tempMouseUp = (upEvent) => {
            console.log(
              `[Roster] tempMouseUp on cell: ${cellKey}, isDragging: ${isDragging}`
            );
            document.removeEventListener("mousemove", tempMouseMove);
            document.removeEventListener("mouseup", tempMouseUp);

            const timeElapsed = Date.now() - startTime;

            if (!isDragging && timeElapsed < 300) {
              console.log(
                `[Roster] Treating interaction as CLICK on cell: ${cellKey}`
              );
              this.isSelecting = false;
              this.handleCellClick(upEvent);
            } else {
              console.log(
                `[Roster] Finalizing drag/long press on cell: ${cellKey}`
              );
              this.isSelecting = false;
              if (this.selectedCells.size > 1) {
                this.renderBulkActionMenu(upEvent);
              }
            }
          };

          document.addEventListener("mousemove", tempMouseMove);
          document.addEventListener("mouseup", tempMouseUp);
        });

        if (shift) {
          const shiftBlock = document.createElement("div");
          shiftBlock.className = `shift day`;
          shiftBlock.style.width = "40px";
          shiftBlock.style.height = "40px";
          shiftBlock.style.borderRadius = "4px";
          shiftBlock.style.display = "flex";
          shiftBlock.style.alignItems = "center";
          shiftBlock.style.justifyContent = "center";
          shiftBlock.style.color = "white";
          shiftBlock.style.fontSize = "0.8rem";
          shiftBlock.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
          shiftBlock.style.pointerEvents = "none";

          if (shift.is_working) {
            shiftBlock.style.backgroundColor = "#4CAF50";
            shiftBlock.style.opacity = "1";
            shiftBlock.textContent = "D";
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
      });

      // Create and Position the single Load More Button
      this.createOrUpdateLoadMoreButton();

      row.appendChild(shiftContainer);
      roster.appendChild(row);
    });

    const mouseUpHandler = (e) => {
      if (this.isSelecting) {
        console.log(
          "[Roster] Document mouseup detected, setting isSelecting=false"
        );
        this.isSelecting = false;
        if (this.selectedCells.size > 1) {
          this.renderBulkActionMenu(e);
        }
      }
      document.removeEventListener("mouseup", mouseUpHandler);
    };
    document.addEventListener("mouseup", mouseUpHandler);
  }

  selectRange(startKey, endKey) {
    console.log(`[Roster] selectRange called: ${startKey} to ${endKey}`);
    const allKeys = [];
    // Regenerate keys based on the *currently rendered* range
    const startDate = new Date(this.viewStartDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + this.viewRange);
    endDate.setDate(0);

    this.workers.forEach((worker) => {
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const cellDateStr = currentDate.toISOString().split("T")[0];
        const cellKey = `${worker}|${cellDateStr}`;
        allKeys.push(cellKey);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    const startIdx = allKeys.indexOf(startKey);
    const endIdx = allKeys.indexOf(endKey);
    if (startIdx !== -1 && endIdx !== -1) {
      const [from, to] = [
        Math.min(startIdx, endIdx),
        Math.max(startIdx, endIdx),
      ];
      const keysInRange = allKeys.slice(from, to + 1);
      if (
        this.selectedCells.size !== keysInRange.length ||
        !keysInRange.every((key) => this.selectedCells.has(key))
      ) {
        this.selectedCells = new Set(keysInRange);
        console.log(
          `[Roster] selectRange updated selection size: ${this.selectedCells.size}`
        );
        this.render();
      }
    } else {
      console.warn(
        `[Roster] selectRange indices not found: start=${startIdx}, end=${endIdx}`
      );
    }
  }

  renderBulkActionMenu(finalEvent) {
    console.log(
      `[Roster] renderBulkActionMenu executing, selected count: ${this.selectedCells.size}`
    );
    let menu = document.getElementById("bulk-action-menu");
    if (menu) menu.remove();
    if (this.selectedCells.size < 2) return;
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
    menu.className = "bulk-action-menu";
    menu.style.position = "absolute";
    menu.style.opacity = "0";
    menu.style.flexDirection = "column";
    menu.style.minWidth = "180px";
    menu.style.background = "rgba(40, 42, 54, 0.95)";
    menu.style.color = "#f8f8f2";
    menu.style.border = "1px solid rgba(255, 255, 255, 0.1)";
    menu.style.borderRadius = "8px";
    menu.style.boxShadow = "0 5px 25px rgba(0, 0, 0, 0.4)";
    menu.style.padding = "8px 15px";
    menu.style.zIndex = "9999";
    menu.style.display = "flex";
    menu.style.gap = "8px";
    menu.style.alignItems = "stretch";
    menu.style.fontSize = "1.05em";

    const counter = document.createElement("span");
    counter.className = "bulk-menu-counter";
    counter.textContent = `${this.selectedCells.size} selected`;
    counter.style.fontWeight = "bold";
    counter.style.color = "#bd93f9";
    counter.style.textAlign = "center";
    counter.style.paddingBottom = "8px";
    counter.style.borderBottom = "1px solid rgba(255, 255, 255, 0.1)";
    menu.appendChild(counter);

    if (hasEmpty || hasShift) {
      const addDayBtn = document.createElement("button");
      addDayBtn.className = "bulk-menu-button button-work";
      addDayBtn.textContent = "Set All to Day";
      addDayBtn.addEventListener("click", async () => {
        menu.remove();
        this.container.classList.add("loading");
        try {
          for (const c of selected) {
            if (!c.shift) {
              const newShift = await rosterApi.addShift({
                worker_name: c.worker,
                shift_type: "day",
                shift_date: c.date,
                is_working: true,
                notes: "",
              });
              if (newShift) this.allShifts.push(newShift);
            } else {
              await rosterApi.updateShift(c.shift.id, {
                shift_type: "day",
                is_working: true,
              });
              const index = this.allShifts.findIndex(
                (s) => s.id === c.shift.id
              );
              if (index !== -1) {
                this.allShifts[index].shift_type = "day";
                this.allShifts[index].is_working = true;
              }
            }
          }
        } catch (error) {
          console.error("Error bulk setting to Day:", error);
          this.showError("Failed to update all shifts.");
        } finally {
          this.selectedCells.clear();
          this.container.classList.remove("loading");
          this.filterAndRender();
        }
      });
      menu.appendChild(addDayBtn);
    }
    if (hasShift) {
      const setRdoBtn = document.createElement("button");
      setRdoBtn.className = "bulk-menu-button button-rdo";
      setRdoBtn.textContent = "Set to RDO";
      setRdoBtn.addEventListener("click", async () => {
        menu.remove();
        this.container.classList.add("loading");
        try {
          for (const c of selected) {
            if (!c.shift) {
              const newShift = await rosterApi.addShift({
                worker_name: c.worker,
                shift_type: "day",
                shift_date: c.date,
                is_working: false,
                notes: "",
              });
              if (newShift) this.allShifts.push(newShift);
            } else {
              await rosterApi.updateShift(c.shift.id, { is_working: false });
              const index = this.allShifts.findIndex(
                (s) => s.id === c.shift.id
              );
              if (index !== -1) this.allShifts[index].is_working = false;
            }
          }
        } catch (error) {
          console.error("Error bulk setting RDO:", error);
          this.showError("Failed to update all shifts.");
        } finally {
          this.selectedCells.clear();
          this.container.classList.remove("loading");
          this.filterAndRender();
        }
      });
      menu.appendChild(setRdoBtn);

      const setWorkingBtn = document.createElement("button");
      setWorkingBtn.className = "bulk-menu-button button-work";
      setWorkingBtn.textContent = "Set to Working";
      setWorkingBtn.addEventListener("click", async () => {
        menu.remove();
        this.container.classList.add("loading");
        try {
          for (const c of selected) {
            if (!c.shift) {
              const newShift = await rosterApi.addShift({
                worker_name: c.worker,
                shift_type: "day",
                shift_date: c.date,
                is_working: true,
                notes: "",
              });
              if (newShift) this.allShifts.push(newShift);
            } else {
              await rosterApi.updateShift(c.shift.id, { is_working: true });
              const index = this.allShifts.findIndex(
                (s) => s.id === c.shift.id
              );
              if (index !== -1) this.allShifts[index].is_working = true;
            }
          }
        } catch (error) {
          console.error("Error bulk setting Working:", error);
          this.showError("Failed to update all shifts.");
        } finally {
          this.selectedCells.clear();
          this.container.classList.remove("loading");
          this.filterAndRender();
        }
      });
      menu.appendChild(setWorkingBtn);

      const removeBtn = document.createElement("button");
      removeBtn.className = "bulk-menu-button button-remove";
      removeBtn.textContent = "Remove Shift(s)";
      removeBtn.addEventListener("click", async () => {
        menu.remove();
        this.container.classList.add("loading");
        const idsToRemove = selected
          .filter((c) => c.shift)
          .map((c) => c.shift.id);
        console.log("[Roster Bulk Delete] Shifts to remove IDs:", idsToRemove);
        try {
          for (const idToRemove of idsToRemove) {
            await rosterApi.deleteShift(idToRemove);
          }
          console.log(
            "[Roster Bulk Delete] allShifts before filter:",
            this.allShifts.length,
            JSON.parse(JSON.stringify(this.allShifts.map((s) => s.id)))
          );
          this.allShifts = this.allShifts.filter(
            (s) => !idsToRemove.includes(s.id)
          );
          console.log(
            "[Roster Bulk Delete] allShifts after filter:",
            this.allShifts.length,
            JSON.parse(JSON.stringify(this.allShifts.map((s) => s.id)))
          );
        } catch (error) {
          console.error("Error bulk removing shifts:", error);
          this.showError("Failed to remove all shifts.");
        } finally {
          this.selectedCells.clear();
          this.container.classList.remove("loading");
          this.filterAndRender();
        }
      });
      menu.appendChild(removeBtn);
    }
    document.body.appendChild(menu);
    console.log("[Roster] Appended bulk action menu.");

    if (finalEvent) {
      this.positionMenu(menu, finalEvent);
    } else {
      menu.style.position = "fixed";
      menu.style.bottom = "20px";
      menu.style.left = "50%";
      menu.style.transform = "translateX(-50%)";
      menu.style.opacity = "1";
      console.warn(
        "[Roster] Bulk menu rendered without finalEvent for positioning."
      );
    }

    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener("mousedown", closeHandler, true);
      }
    };
    setTimeout(() => {
      document.addEventListener("mousedown", closeHandler, true);
    }, 0);
  }

  showCellMenu(worker, date, shift, cell, clickEvent) {
    console.log("[Roster] showCellMenu called for:", { worker, date, shift });
    document.getElementById("cell-context-menu")?.remove();

    const menu = document.createElement("div");
    menu.id = "cell-context-menu";
    menu.className = "cell-context-menu";

    const header = document.createElement("div");
    header.className = "context-menu-header";
    // Parse YYYY-MM-DD manually and create Date using UTC to avoid timezone issues
    const [year, month, day] = date.split("-").map(Number);
    // Use UTC date object to get weekday reliably, then format manually
    const displayDateUTC = new Date(Date.UTC(year, month - 1, day));
    const weekday = displayDateUTC.toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC",
    });
    const monthName = displayDateUTC.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
    header.textContent = `${weekday}, ${monthName} ${day}, ${year}`;
    menu.appendChild(header);

    const actions = document.createElement("div");
    actions.className = "context-menu-section context-menu-actions";

    if (shift) {
      const toggleWorkBtn = document.createElement("button");
      toggleWorkBtn.textContent = shift.is_working
        ? "Set to RDO"
        : "Set to Working";
      toggleWorkBtn.className = shift.is_working
        ? "context-menu-button button-rdo"
        : "context-menu-button button-work";
      toggleWorkBtn.onclick = async () => {
        try {
          const newWorkingStatus = !shift.is_working;
          await rosterApi.updateShift(shift.id, {
            is_working: newWorkingStatus,
          });
          menu.remove();
          const index = this.allShifts.findIndex((s) => s.id === shift.id);
          if (index !== -1) {
            this.allShifts[index].is_working = newWorkingStatus;
          }
          this.filterAndRender();
        } catch (err) {
          console.error("Error toggling work status:", err);
          this.showError("Failed to update shift.");
        }
      };
      actions.appendChild(toggleWorkBtn);

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove Shift";
      removeBtn.className = "context-menu-button button-remove";
      removeBtn.onclick = async () => {
        if (confirm("Are you sure you want to remove this shift?")) {
          try {
            const idToRemove = shift.id;
            console.log(
              `[Roster Single Delete] Removing shift ID: ${idToRemove}`
            );
            await rosterApi.deleteShift(idToRemove);
            menu.remove();
            console.log(
              "[Roster Single Delete] allShifts before filter:",
              this.allShifts.length,
              JSON.parse(JSON.stringify(this.allShifts.map((s) => s.id)))
            );
            this.allShifts = this.allShifts.filter((s) => s.id !== idToRemove);
            console.log(
              "[Roster Single Delete] allShifts after filter:",
              this.allShifts.length,
              JSON.parse(JSON.stringify(this.allShifts.map((s) => s.id)))
            );
            this.filterAndRender();
          } catch (err) {
            console.error("Error removing shift:", err);
            this.showError("Failed to remove shift.");
          }
        }
      };
      actions.appendChild(removeBtn);
    } else {
      const addShiftBtn = document.createElement("button");
      addShiftBtn.textContent = "Add Shift";
      addShiftBtn.className = "context-menu-button button-work";
      addShiftBtn.onclick = async () => {
        try {
          const newShift = await rosterApi.addShift({
            worker_name: worker,
            shift_date: date,
            shift_type: "day",
            is_working: true,
            notes: "",
          });
          menu.remove();
          if (newShift) {
            this.allShifts.push(newShift);
            this.filterAndRender();
          } else {
            this.loadInitialData(true);
          }
        } catch (err) {
          console.error("Error adding shift:", err);
          this.showError("Failed to add shift.");
        }
      };
      actions.appendChild(addShiftBtn);

      const addRdoBtn = document.createElement("button");
      addRdoBtn.textContent = "Add RDO";
      addRdoBtn.className = "context-menu-button button-rdo";
      addRdoBtn.onclick = async () => {
        try {
          const newShift = await rosterApi.addShift({
            worker_name: worker,
            shift_date: date,
            shift_type: "day",
            is_working: false,
            notes: "",
          });
          menu.remove();
          if (newShift) {
            this.allShifts.push(newShift);
            this.filterAndRender();
          } else {
            this.loadInitialData(true);
          }
        } catch (err) {
          console.error("Error adding RDO:", err);
          this.showError("Failed to add RDO.");
        }
      };
      actions.appendChild(addRdoBtn);
    }
    menu.appendChild(actions);

    if (shift) {
      const notesSection = document.createElement("div");
      notesSection.className = "context-menu-section context-menu-notes";

      const notesLabel = document.createElement("label");
      notesLabel.textContent = "Notes:";
      notesLabel.htmlFor = `notes-input-${shift.id}`;

      const notesInput = document.createElement("textarea");
      notesInput.id = `notes-input-${shift.id}`;
      notesInput.value = shift.notes || "";
      notesInput.placeholder = "Add notes...";
      notesInput.rows = 3;

      const saveNotesBtn = document.createElement("button");
      saveNotesBtn.textContent = "Save Notes";
      saveNotesBtn.className = "context-menu-button button-save";
      saveNotesBtn.onclick = async () => {
        try {
          const newNotes = notesInput.value;
          await rosterApi.updateShift(shift.id, { notes: newNotes });
          menu.remove();
          const index = this.allShifts.findIndex((s) => s.id === shift.id);
          if (index !== -1) {
            this.allShifts[index].notes = newNotes;
          }
        } catch (err) {
          console.error("Error saving notes:", err);
          this.showError("Failed to save notes.");
        }
      };

      notesSection.appendChild(notesLabel);
      notesSection.appendChild(notesInput);
      notesSection.appendChild(saveNotesBtn);
      menu.appendChild(notesSection);
    }

    document.body.appendChild(menu);
    console.log("[Roster] Appended context menu to body.");
    this.positionMenu(menu, clickEvent);

    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener("mousedown", closeHandler, true);
      }
    };
    setTimeout(() => {
      document.addEventListener("mousedown", closeHandler, true);
    }, 0);
  }

  positionMenu(menu, clickEvent) {
    menu.style.position = "absolute";
    menu.style.left = `${clickEvent.clientX + 5}px`;
    menu.style.top = `${clickEvent.clientY + 5}px`;
    menu.style.opacity = "0";

    requestAnimationFrame(() => {
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let left = clickEvent.clientX + 5;
      let top = clickEvent.clientY + 5;

      if (left + menuRect.width > viewportWidth - 10) {
        left = clickEvent.clientX - menuRect.width - 5;
      }
      if (top + menuRect.height > viewportHeight - 10) {
        top = clickEvent.clientY - menuRect.height - 5;
      }
      left = Math.max(10, left);
      top = Math.max(10, top);

      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
      menu.style.opacity = "1";
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
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .roster-root-container {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 100px);
        overflow: hidden;
        position: relative;
      }

      .roster-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--bg-dark);
        border: 1px solid var(--border-dark);
        border-radius: var(--border-radius);
        color: #f8f8f2;
      }

      .roster-header {
        padding: 15px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border-dark);
        background: rgba(40, 42, 54, 0.8);
      }
      .roster-header h2 {
        margin: 0;
        font-size: 1.2rem;
        color: #f8f8f2;
      }

      .roster-controls {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .roster-controls span {
        color: #f8f8f2;
        font-size: 0.9rem;
        margin: 0 5px;
      }

      .roster-control-button {
        background: #44475a;
        color: #f8f8f2;
        border: 1px solid #6272a4;
        padding: 5px 10px;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        font-size: 0.9rem;
      }
      .roster-control-button:hover {
        background: #6272a4;
      }

      .gantt-scroll-container {
        flex: 1;
        overflow: auto;
        position: relative;
        border: 1px solid var(--border-dark);
        margin: 20px;
        border-radius: var(--border-radius);
        background: rgba(68, 71, 90, 0.5);
      }

      .gantt-content {
        display: flex;
        flex-direction: column;
        min-width: fit-content;
      }

      .timeline {
        display: flex;
        border-bottom: 1px solid var(--border-dark);
        background: rgba(40, 42, 54, 0.8);
        margin-left: 150px;
        position: sticky;
        top: 0;
        z-index: 2;
      }

      .timeline-cell {
        min-width: 50px;
        width: 50px;
        height: 60px;
        border-right: 1px solid var(--border-dark);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        color: #a0a8b4;
        padding: 5px 0;
        text-align: center;
        box-sizing: border-box;
      }
       .timeline-cell.today { background-color: rgba(189, 147, 249, 0.15); }
       .timeline-cell.weekend { background-color: rgba(255, 255, 255, 0.03); }

      .roster { display: flex; flex-direction: column; }

      .worker-row {
        display: flex;
        min-height: 60px;
        border-bottom: 1px solid var(--border-dark);
        position: relative;
      }

      .worker-name {
        width: 150px;
        min-width: 150px;
        position: sticky;
        left: 0;
        background: rgba(40, 42, 54, 0.8);
        border-right: 1px solid var(--border-dark);
        display: flex;
        align-items: center;
        padding: 0 15px;
        font-weight: 500;
        z-index: 1;
        color: #f8f8f2;
        box-sizing: border-box;
      }

      .shift-container {
        position: relative;
        flex-grow: 1;
        display: flex;
        min-height: 60px;
      }

      .roster-grid-cell {
        width: 50px;
        min-width: 50px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        border-right: 1px solid var(--border-dark);
        background: transparent;
        box-sizing: border-box;
        transition: background-color 0.15s ease;
      }
      .roster-grid-cell:hover {
        background-color: rgba(255, 255, 255, 0.05);
      }
       .roster-grid-cell.weekend { background-color: rgba(255, 255, 255, 0.02); }
       .roster-grid-cell.today { background-color: rgba(189, 147, 249, 0.1); }
       .roster-grid-cell .plus-btn {
          color: #6272a4;
          font-size: 1.2rem;
          opacity: 0.6;
          pointer-events: none;
          transition: opacity 0.2s ease;
       }
      .roster-grid-cell:hover .plus-btn {
          opacity: 1;
      }

      .roster-grid-cell.selected {
        outline: none;
        background-color: rgba(139, 233, 253, 0.2);
        box-shadow: inset 0 0 0 2px rgba(139, 233, 253, 0.6);
        border-radius: 4px;
      }

      .shift {
        width: 40px;
        height: 40px;
        position: relative;
        transform: none;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 0.9rem;
        font-weight: 500;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        pointer-events: none;
        margin: auto;
      }

      .shift.day { background-color: #50fa7b; color: #282a36; }
      .shift.rdo { background-color: #ffb86c; color: #282a36; opacity: 0.9; }

      .loading-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background-color: rgba(40, 42, 54, 0.7);
        color: #f8f8f2;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        z-index: 10;
        backdrop-filter: blur(3px);
        -webkit-backdrop-filter: blur(3px);
      }
      .roster-root-container.loading .loading-overlay {
        display: flex;
      }

      .cell-context-menu {
        background-color: rgba(40, 42, 54, 0.95);
        color: #f8f8f2;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.4);
        padding: 0;
        z-index: 1001;
        min-width: 200px;
        max-width: 280px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.9rem;
        transition: opacity 0.15s ease-out;
      }
      .context-menu-header {
        padding: 10px 15px;
        font-weight: bold;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        color: #bd93f9;
      }
      .context-menu-section {
        padding: 15px;
      }
      .context-menu-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
       .context-menu-notes {
           border-top: 1px solid rgba(255, 255, 255, 0.1);
       }
       .context-menu-notes label {
           display: block;
           margin-bottom: 6px;
           font-size: 0.85rem;
           color: #a0a8b4;
       }
      .context-menu-notes textarea {
          width: 100%;
          background-color: rgba(68, 71, 90, 0.8);
          color: #f8f8f2;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          padding: 8px;
          box-sizing: border-box;
          font-family: inherit;
          resize: vertical;
          min-height: 60px;
          margin-bottom: 8px;
      }
      .context-menu-notes textarea:focus {
          outline: none;
          border-color: #bd93f9;
          box-shadow: 0 0 0 2px rgba(189, 147, 249, 0.3);
      }
      .context-menu-button {
          background: transparent;
          color: #f8f8f2;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 8px 12px;
          border-radius: 5px;
          cursor: pointer;
          text-align: center;
          width: 100%;
          transition: background-color 0.2s ease, border-color 0.2s ease;
          font-size: 0.9rem;
      }
      .context-menu-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
      }
      .context-menu-button.button-work { border-color: #50fa7b; color: #50fa7b; }
       .context-menu-button.button-work:hover { background-color: rgba(80, 250, 123, 0.15); }
      .context-menu-button.button-rdo { border-color: #ffb86c; color: #ffb86c; }
       .context-menu-button.button-rdo:hover { background-color: rgba(255, 184, 108, 0.15); }
      .context-menu-button.button-remove { border-color: #ff5555; color: #ff5555; }
       .context-menu-button.button-remove:hover { background-color: rgba(255, 85, 85, 0.15); }
      .context-menu-button.button-save { border-color: #bd93f9; color: #bd93f9; }
       .context-menu-button.button-save:hover { background-color: rgba(189, 147, 249, 0.15); }

       .bulk-action-menu {
           position: absolute;
           opacity: 0;
           flex-direction: column;
           min-width: 180px;
           background-color: rgba(40, 42, 54, 0.95);
           color: #f8f8f2;
           border: 1px solid rgba(255, 255, 255, 0.1);
           border-radius: 8px;
           box-shadow: 0 5px 25px rgba(0, 0, 0, 0.4);
           padding: 8px 15px;
           z-index: 9999;
           display: flex;
           gap: 8px;
           align-items: stretch;
           backdrop-filter: blur(10px);
           -webkit-backdrop-filter: blur(10px);
           font-family: 'JetBrains Mono', monospace;
       }
       .bulk-menu-counter {
           font-weight: bold;
           color: #bd93f9;
           text-align: center;
           padding-bottom: 8px;
           border-bottom: 1px solid rgba(255, 255, 255, 0.1);
           font-size: 0.9rem;
       }
       .bulk-menu-button {
           background: transparent;
           color: #f8f8f2;
           border: 1px solid rgba(255, 255, 255, 0.2);
           padding: 6px 10px;
           border-radius: 5px;
           cursor: pointer;
           text-align: center;
           transition: background-color 0.2s ease, border-color 0.2s ease;
           font-size: 0.85rem;
       }
       .bulk-menu-button:hover {
           background-color: rgba(255, 255, 255, 0.1);
           border-color: rgba(255, 255, 255, 0.3);
       }
       .bulk-menu-button.button-work { border-color: #50fa7b; color: #50fa7b; }
       .bulk-menu-button.button-work:hover { background-color: rgba(80, 250, 123, 0.15); }
       .bulk-menu-button.button-rdo { border-color: #ffb86c; color: #ffb86c; }
       .bulk-menu-button.button-rdo:hover { background-color: rgba(255, 184, 108, 0.15); }
       .bulk-menu-button.button-remove { border-color: #ff5555; color: #ff5555; }
       .bulk-menu-button.button-remove:hover { background-color: rgba(255, 85, 85, 0.15); }

       /* Single Load More Button Styling */
       .load-more-button {
           position: absolute;
           /* Vertical Centering */
           top: 50%;
           transform: translateY(-50%);
           /* --- */
           padding: 8px 15px;
           background: #44475a; /* Match control buttons */
           color: #f8f8f2;
           border: 1px solid #6272a4;
           border-radius: 5px;
           cursor: pointer;
           display: flex;
           align-items: center;
           justify-content: center;
           font-family: 'JetBrains Mono', monospace;
           font-size: 0.9rem;
           z-index: 3; /* Above timeline/roster but below menus */
           transition: background-color 0.2s ease, opacity 0.2s ease, left 0.3s ease-out; /* Added left transition */
       }
       .load-more-button:hover {
            background: #6272a4;
       }
       .load-more-button.loading {
            opacity: 0.6;
            cursor: default;
       }

       /* Note Indicator */
       .roster-grid-cell.has-notes::after {
           content: '';
           position: absolute;
           top: 5px;
           right: 5px;
           width: 7px;
           height: 7px;
           background-color: #ff79c6; /* Pink color from theme */
           border-radius: 50%;
           border: 1px solid rgba(40, 42, 54, 0.5); /* Dark border for contrast */
           box-shadow: 0 0 3px rgba(255, 121, 198, 0.5);
           z-index: 1; /* Above shift block if needed */
       }
    `;
    document.head.appendChild(style);
  }

  handleCellClick(event) {
    console.log(
      "[Roster] handleCellClick processing potential click event:",
      event.type
    );
    console.log("[Roster] event.target for handleCellClick:", event.target);

    document.getElementById("bulk-action-menu")?.remove();

    const cell = event.target.closest(".roster-grid-cell");
    console.log(
      "[Roster] handleCellClick - result of closest('.roster-grid-cell'):",
      cell
    );

    if (!cell) {
      console.error("[Roster] handleCellClick called but couldn't find cell.");
      return;
    }

    const worker = cell.dataset.worker;
    const date = cell.dataset.date;

    if (!worker || !date) {
      console.error(
        "[Roster] Cell missing worker or date data in handleCellClick:",
        cell
      );
      return;
    }
    console.log(
      `[Roster] Processing CLICK for menu: Worker=${worker}, Date=${date}`
    );

    this.selectedCells.clear();

    const shift = this.shifts.find(
      (s) =>
        s.worker_name === worker &&
        new Date(s.shift_date).toDateString() === new Date(date).toDateString()
    );
    console.log("[Roster] Found shift for cell menu:", shift);

    this.showCellMenu(worker, date, shift, cell, event);
  }

  setupSelectionHandlers() {
    console.warn(
      "[Roster] setupSelectionHandlers function called but might be redundant."
    );
  }

  setupEventListeners() {
    console.warn(
      "[Roster] setupEventListeners function called - ensure listeners aren't duplicated."
    );
  }

  async appendNextMonth() {
    if (this.isLoadingMore) return;

    console.log("[Roster] Appending next month...");
    this.isLoadingMore = true;
    const loadMoreButton = this.container.querySelector("#load-more-roster");
    if (loadMoreButton) loadMoreButton.classList.add("loading");

    // --- Calculate range for the *new* month ---
    const currentViewEndMonth = new Date(this.viewStartDate);
    currentViewEndMonth.setMonth(
      currentViewEndMonth.getMonth() + this.viewRange
    );
    const appendStartDate = new Date(currentViewEndMonth);
    appendStartDate.setDate(1);

    const appendEndDate = new Date(appendStartDate);
    appendEndDate.setMonth(appendEndDate.getMonth() + 1);
    appendEndDate.setDate(0); // End of the new month

    // --- Check if data fetch is needed for this new month ---
    const needsFetch =
      !this.fetchedRange.end || appendEndDate > this.fetchedRange.end;
    if (needsFetch) {
      console.log("[Roster] Fetching additional data for appended month...");
      // Define a fetch range - ideally fetch a bit more ahead
      const fetchMoreStartDate = new Date(
        this.fetchedRange.end || appendStartDate
      );
      // Ensure start date is adjusted if needed (e.g., +1 day from last fetch end)
      fetchMoreStartDate.setDate(fetchMoreStartDate.getDate() + 1);

      const fetchMoreEndDate = new Date(appendEndDate);
      fetchMoreEndDate.setMonth(fetchMoreEndDate.getMonth() + 6); // Fetch 6 more months

      try {
        const apiShifts = await rosterApi.getShifts(
          fetchMoreStartDate,
          fetchMoreEndDate
        );
        if (apiShifts && apiShifts.length > 0) {
          // Merge new shifts with existing ones, avoiding duplicates
          const existingIds = new Set(this.allShifts.map((s) => s.id));
          const newUniqueShifts = apiShifts.filter(
            (s) => !existingIds.has(s.id)
          );
          this.allShifts.push(...newUniqueShifts);
          // Update fetched range end *only* if new data was actually fetched and merged
          this.fetchedRange.end = fetchMoreEndDate;
          console.log(
            `[Roster] Fetched ${
              newUniqueShifts.length
            } new shifts. Updated fetchedRange end: ${this.fetchedRange.end.toISOString()}`
          );
        } else {
          console.log("[Roster] No new shifts found in fetched range.");
          // Still update fetched range end to avoid re-fetching the same empty range
          if (
            !this.fetchedRange.end ||
            fetchMoreEndDate > this.fetchedRange.end
          ) {
            this.fetchedRange.end = fetchMoreEndDate;
          }
        }
      } catch (error) {
        console.error("[Roster] Error fetching additional data:", error);
        this.showError("Failed to load data for next month.");
        if (loadMoreButton) loadMoreButton.classList.remove("loading");
        this.isLoadingMore = false;
        return; // Stop appending if fetch fails
      }
    }

    // --- Append cells ---
    const timeline = this.container.querySelector("#timeline");
    const roster = this.container.querySelector("#roster");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentDate = new Date(appendStartDate);
    const datesToAppend = [];
    while (currentDate <= appendEndDate) {
      datesToAppend.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Filter shifts for the new month once
    const appendStartStr = appendStartDate.toISOString().split("T")[0];
    const appendEndStr = appendEndDate.toISOString().split("T")[0];
    const shiftsForNewMonth = this.allShifts.filter((shift) => {
      return (
        shift.shift_date >= appendStartStr && shift.shift_date <= appendEndStr
      );
    });

    // Remove button before appending to avoid it shifting during DOM updates
    if (loadMoreButton) loadMoreButton.remove();

    // Append to timeline
    datesToAppend.forEach((date) => {
      const cell = document.createElement("div");
      cell.className = "timeline-cell";
      cell.style.width = "50px";
      cell.style.minWidth = "50px";
      cell.style.height = "60px";
      cell.style.borderRight = "1px solid var(--border-dark)";
      cell.style.display = "flex";
      cell.style.flexDirection = "column";
      cell.style.alignItems = "center";
      cell.style.justifyContent = "center";
      cell.style.gap = "2px";
      cell.style.boxSizing = "border-box";

      const dayName = date.toLocaleString("default", { weekday: "short" });
      const dayLabel = document.createElement("div");
      dayLabel.textContent = dayName;
      dayLabel.style.fontSize = "0.7rem";
      dayLabel.style.color = "#a0a8b4";
      cell.appendChild(dayLabel);

      const dateNum = document.createElement("div");
      dateNum.textContent = date.getDate();
      dateNum.style.fontSize = "0.9rem";
      cell.appendChild(dateNum);

      if (date.getDate() === 1) {
        const monthName = date.toLocaleString("default", { month: "short" });
        const monthLabel = document.createElement("div");
        monthLabel.textContent = monthName;
        monthLabel.style.fontSize = "0.7rem";
        monthLabel.style.opacity = "0.7";
        cell.appendChild(monthLabel);
      }

      if (date.getTime() === today.getTime()) {
        cell.classList.add("today");
        cell.style.backgroundColor = "rgba(189, 147, 249, 0.15)";
        cell.style.fontWeight = "bold";
      }
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        cell.classList.add("weekend");
        cell.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
      }

      timeline.appendChild(cell);
    });
    // Update timeline width AFTER appending all cells for the month
    timeline.style.minWidth = `${
      parseInt(timeline.style.minWidth || "0") + datesToAppend.length * 50
    }px`;

    // Append to roster rows
    this.workers.forEach((worker) => {
      const row = roster.querySelector(`.worker-row[data-worker="${worker}"]`);
      const shiftContainer = row?.querySelector(".shift-container");
      if (shiftContainer) {
        console.log(
          `[Roster Append] Found shiftContainer for worker: ${worker}`
        );
        datesToAppend.forEach((cellDate) => {
          const cellDateStr = cellDate.toISOString().split("T")[0];
          const cellKey = `${worker}|${cellDateStr}`;

          // Find shift using the pre-filtered list for the new month
          const shift = shiftsForNewMonth.find(
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
          cell.style.borderRight = "1px solid var(--border-dark)";
          cell.style.background = "transparent";
          cell.style.boxSizing = "border-box";

          cell.setAttribute("data-worker", worker);
          cell.setAttribute("data-date", cellDateStr);
          cell.setAttribute("data-key", cellKey);

          // Add weekend/today highlights (match renderRoster)
          if (cellDate.getTime() === today.getTime()) {
            cell.classList.add("today");
            cell.style.background = "rgba(189, 147, 249, 0.1)";
            cell.style.fontWeight = "bold";
          }
          const dayOfWeek = cellDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            cell.classList.add("weekend");
            cell.style.background = "rgba(255, 255, 255, 0.02)";
          }

          // Attach event listeners
          this.attachCellEventListeners(cell, cellKey);

          // Render shift block or plus button (match renderRoster)
          if (shift) {
            const shiftBlock = document.createElement("div");
            shiftBlock.className = shift.is_working ? `shift day` : `shift rdo`;
            shiftBlock.style.width = "40px";
            shiftBlock.style.height = "40px";
            shiftBlock.style.borderRadius = "4px";
            shiftBlock.style.display = "flex";
            shiftBlock.style.alignItems = "center";
            shiftBlock.style.justifyContent = "center";
            shiftBlock.style.fontSize = "0.9rem";
            shiftBlock.style.fontWeight = "500";
            shiftBlock.style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
            shiftBlock.style.pointerEvents = "none";
            shiftBlock.style.margin = "auto";
            shiftBlock.textContent = shift.is_working ? "D" : "RDO";
            cell.appendChild(shiftBlock);
          } else {
            const plusBtn = document.createElement("span");
            plusBtn.className = "plus-btn";
            plusBtn.textContent = "+";
            cell.appendChild(plusBtn);
          }

          shiftContainer.appendChild(cell);
        });
      } else {
        console.error(
          `[Roster Append] Could not find shiftContainer for worker: ${worker}`
        );
      }
    });

    // --- Update State and UI ---
    this.createOrUpdateLoadMoreButton();
    this.viewRange += 1;
    this.isLoadingMore = false;
    console.log(
      "[Roster] Finished appending month. New viewRange:",
      this.viewRange
    );
  }

  createOrUpdateLoadMoreButton() {
    const ganttContent = this.container.querySelector(".gantt-content");
    if (!ganttContent) return;

    let button = ganttContent.querySelector("#load-more-roster");
    if (!button) {
      button = document.createElement("button");
      button.id = "load-more-roster";
      button.className = "load-more-button";
      button.innerHTML = "<span>+1 Month →</span>";
      button.title = "Load next month";
      button.addEventListener("click", () => this.appendNextMonth());
      ganttContent.appendChild(button);
    }

    // Calculate position based on current content width
    const timeline = ganttContent.querySelector("#timeline");
    const nameColumnWidth = 150;
    const currentTimelineWidth = timeline ? timeline.offsetWidth : 0;
    const buttonLeftPosition = nameColumnWidth + currentTimelineWidth + 10; // 10px buffer

    button.style.left = `${buttonLeftPosition}px`;
    // Center vertically within the parent (gantt-content)
    button.style.top = "50%";
    button.style.transform = "translateY(-50%)";
  }

  // Helper function to attach listeners (extract from renderRoster)
  attachCellEventListeners(cell, cellKey) {
    let isDragging = false;
    let startX, startY, startTime;

    cell.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;

      // --- Ctrl/Meta Click ---
      if (e.ctrlKey || e.metaKey) {
        console.log("[Roster] mousedown with Ctrl/Meta");
        this.selectedCells.add(cellKey);
        this.render();
        this.renderBulkActionMenu(e);
        return;
      }

      // --- Shift Click ---
      if (e.shiftKey && this.selectionStart) {
        console.log("[Roster] mousedown with Shift");
        e.preventDefault();
        const startWorker = this.selectionStart.split("|")[0];
        const currentWorker = cellKey.split("|")[0];
        if (startWorker === currentWorker) {
          this.selectRange(this.selectionStart, cellKey);
          this.renderBulkActionMenu(e);
        }
        return;
      }

      // --- Normal Click / Drag Start ---
      e.preventDefault();
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      this.isSelecting = true;
      this.selectionStart = cellKey;

      this.selectedCells.clear();
      this.selectedCells.add(cellKey);
      this.render();

      const tempMouseMove = (moveEvent) => {
        if (
          !isDragging &&
          (Math.abs(moveEvent.clientX - startX) > 5 ||
            Math.abs(moveEvent.clientY - startY) > 5)
        ) {
          console.log(`[Roster] Drag detected on cell: ${cellKey}`);
          isDragging = true;
        }
        if (isDragging) {
          const startWorker = this.selectionStart?.split("|")[0];
          const currentCell = moveEvent.target.closest(".roster-grid-cell");
          if (currentCell && startWorker) {
            const currentKey = currentCell.dataset.key;
            const currentWorker = currentCell.dataset.worker;
            if (currentKey && currentWorker === startWorker) {
              this.selectRange(this.selectionStart, currentKey);
            }
          }
        }
      };

      const tempMouseUp = (upEvent) => {
        document.removeEventListener("mousemove", tempMouseMove);
        document.removeEventListener("mouseup", tempMouseUp);

        const timeElapsed = Date.now() - startTime;

        if (!isDragging && timeElapsed < 300) {
          console.log(
            `[Roster] Treating interaction as CLICK on cell: ${cellKey}`
          );
          this.isSelecting = false;
          this.handleCellClick(upEvent);
        } else {
          console.log(
            `[Roster] Finalizing drag/long press on cell: ${cellKey}`
          );
          this.isSelecting = false;
          if (this.selectedCells.size > 1) {
            this.renderBulkActionMenu(upEvent);
          }
        }
      };

      document.addEventListener("mousemove", tempMouseMove);
      document.addEventListener("mouseup", tempMouseUp);
    });
  }
}
