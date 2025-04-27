import { dataOperations } from "../supabase.js";

export class Calendar {
  constructor(container) {
    this.container = container;
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.events = [];
  }

  async init() {
    try {
      await this.loadEvents();
      this.render();
      this.attachEventListeners();
    } catch (error) {
      console.error("Error initializing calendar:", error);
      this.showError("Failed to initialize calendar");
    }
  }

  async loadEvents() {
    try {
      // Load events from Supabase
      const { data, error } = await dataOperations.getEvents();
      if (error) throw error;
      this.events = data || [];
    } catch (error) {
      console.error("Error loading events:", error);
      throw error;
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="calendar-container">
        <div class="calendar-header">
          <button class="prev-month">&lt;</button>
          <h2>${this.getMonthYear()}</h2>
          <button class="next-month">&gt;</button>
        </div>
        <div class="calendar-grid">
          ${this.generateCalendarGrid()}
        </div>
        <div class="calendar-events">
          <h3>Events for ${this.formatDate(this.selectedDate)}</h3>
          <div class="events-list">
            ${this.renderEvents()}
          </div>
          <button class="add-event-btn">Add Event</button>
        </div>
      </div>
    `;
  }

  generateCalendarGrid() {
    const daysInMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      0
    ).getDate();

    const firstDay = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      1
    ).getDay();

    let gridHTML = this.generateWeekdayHeaders();
    let dayCount = 1;
    let gridCells = "";

    // Fill in empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      gridCells += '<div class="calendar-cell empty"></div>';
    }

    // Fill in the days of the month
    while (dayCount <= daysInMonth) {
      const isToday = this.isToday(dayCount);
      const isSelected = this.isSelectedDate(dayCount);
      const hasEvents = this.hasEventsOnDate(dayCount);

      gridCells += `
        <div class="calendar-cell ${isToday ? "today" : ""} ${
        isSelected ? "selected" : ""
      } ${hasEvents ? "has-events" : ""}"
             data-date="${this.formatDateForAttribute(dayCount)}">
          ${dayCount}
        </div>
      `;
      dayCount++;
    }

    return gridHTML + gridCells;
  }

  generateWeekdayHeaders() {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return weekdays
      .map((day) => `<div class="weekday-header">${day}</div>`)
      .join("");
  }

  getMonthYear() {
    return this.currentDate.toLocaleString("default", {
      month: "long",
      year: "numeric",
    });
  }

  formatDate(date) {
    return date.toLocaleDateString("default", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  formatDateForAttribute(day) {
    return `${this.currentDate.getFullYear()}-${String(
      this.currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  isToday(day) {
    const today = new Date();
    return (
      day === today.getDate() &&
      this.currentDate.getMonth() === today.getMonth() &&
      this.currentDate.getFullYear() === today.getFullYear()
    );
  }

  isSelectedDate(day) {
    return (
      day === this.selectedDate.getDate() &&
      this.currentDate.getMonth() === this.selectedDate.getMonth() &&
      this.currentDate.getFullYear() === this.selectedDate.getFullYear()
    );
  }

  hasEventsOnDate(day) {
    const dateToCheck = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      day
    );
    return this.events.some((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === dateToCheck.getDate() &&
        eventDate.getMonth() === dateToCheck.getMonth() &&
        eventDate.getFullYear() === dateToCheck.getFullYear()
      );
    });
  }

  renderEvents() {
    const todayEvents = this.events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === this.selectedDate.getDate() &&
        eventDate.getMonth() === this.selectedDate.getMonth() &&
        eventDate.getFullYear() === this.selectedDate.getFullYear()
      );
    });

    if (todayEvents.length === 0) {
      return "<p>No events scheduled for this date.</p>";
    }

    return todayEvents
      .map(
        (event) => `
        <div class="event-item">
          <h4>${event.title}</h4>
          <p>${event.time}</p>
          <p>${event.description}</p>
        </div>
      `
      )
      .join("");
  }

  addEvent(event) {
    this.events.push(event);
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
  }

  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
  }

  selectDate(date) {
    this.selectedDate = new Date(date);
  }

  attachEventListeners() {
    // Previous month button
    const prevButton = this.container.querySelector(".prev-month");
    if (prevButton) {
      prevButton.addEventListener("click", () => {
        this.previousMonth();
        this.render();
        this.attachEventListeners();
      });
    }

    // Next month button
    const nextButton = this.container.querySelector(".next-month");
    if (nextButton) {
      nextButton.addEventListener("click", () => {
        this.nextMonth();
        this.render();
        this.attachEventListeners();
      });
    }

    // Date selection
    const cells = this.container.querySelectorAll(".calendar-cell:not(.empty)");
    cells.forEach((cell) => {
      cell.addEventListener("click", () => {
        const dateStr = cell.getAttribute("data-date");
        if (dateStr) {
          this.selectDate(dateStr);
          this.render();
          this.attachEventListeners();
        }
      });
    });

    // Add event button
    const addEventBtn = this.container.querySelector(".add-event-btn");
    if (addEventBtn) {
      addEventBtn.addEventListener("click", () => {
        this.showEventModal();
      });
    }
  }

  showEventModal() {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Add Event</h3>
        <form id="add-event-form">
          <input type="text" placeholder="Event Title" required>
          <input type="time" required>
          <textarea placeholder="Event Description" rows="3"></textarea>
          <button type="submit">Save Event</button>
          <button type="button" class="close-modal">Cancel</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const form = modal.querySelector("form");
    const closeBtn = modal.querySelector(".close-modal");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const [title, time, description] = [
        form.querySelector('input[type="text"]').value,
        form.querySelector('input[type="time"]').value,
        form.querySelector("textarea").value,
      ];

      try {
        await dataOperations.addEvent({
          title,
          time,
          description,
          date: this.selectedDate.toISOString().split("T")[0],
        });
        await this.loadEvents();
        this.render();
        this.attachEventListeners();
        document.body.removeChild(modal);
      } catch (error) {
        console.error("Error adding event:", error);
        this.showError("Failed to add event");
      }
    });

    closeBtn.addEventListener("click", () => {
      document.body.removeChild(modal);
    });
  }

  showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    this.container.prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 3000);
  }
}
