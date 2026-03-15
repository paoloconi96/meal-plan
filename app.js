const mealSections = [
  {
    id: "colazione",
    label: "Breakfast",
    note: "Always include 1 glass of water on an empty stomach.",
    options: [
      "40 g di pane integrale tostato + 2 uova strapazzate (1 tuorlo e 2 albumi)",
      "40 g di pane integrale tostato + 1 cucchiaino di marmellata senza zuccheri aggiunti + 150 g di skyr",
      "Pancake con 40 g di farina di avena, 2 albumi, 100 ml di latte di mandorla, lievito opzionale, cannella, sale + 1 cucchiaino di marmellata senza zuccheri aggiunti",
      "150 g di skyr + 40 g di fiocchi di avena + un frutto",
    ],
  },
  {
    id: "spuntinoMattina",
    label: "Morning snack",
    note: "Same options as the afternoon snack. On training days you can add a fruit to the yogurt.",
    options: [
      "125 g di yogurt intero o yogurt greco 2%",
      "150 g di frutta di stagione",
      "Triangolini di legumi o gallette (porzione da 20 g)",
    ],
  },
  {
    id: "pranzo",
    label: "Lunch",
    note: "These plan options are flexible: you can use them on any day.",
    options: [
      "80 g di pasta (100 g nei giorni di allenamento) con 120 g di tonno al naturale, pomodorini + 2 cucchiaini di olio evo",
      "80 g di riso basmati con 2 uova strapazzate, 100 g di piselli + 2 cucchiaini di olio evo",
      "80 g di riso venere o pasta con 120 g di salmone al naturale, rucola + 2 cucchiaini di olio evo",
      "80 g di farro con 150 g di ceci precotti, zucchine saltate + 2 cucchiaini di olio evo",
      "80 g di pasta con sugo di pomodoro e 120 g di ricotta magra o quark magro + 2 cucchiaini di olio evo",
      "200 g di pesce fresco o surgelato, spinaci + 2 cucchiaini di olio evo + 50 g di pane tostato integrale",
      "80 g di pasta con passata di pomodoro, 150 g di macinato magro, bietole + 2 cucchiaini di olio evo",
    ],
  },
  {
    id: "spuntinoPomeriggio",
    label: "Afternoon snack",
    note: "Same options as the morning snack.",
    options: [
      "125 g di yogurt intero o yogurt greco 2%",
      "150 g di frutta di stagione",
      "Triangolini di legumi o gallette (porzione da 20 g)",
    ],
  },
  {
    id: "cena",
    label: "Dinner",
    note: "Here too, the original plan options can be used on any day.",
    options: [
      "160 g di petto di pollo, lattuga + 2 cucchiaini di olio evo + 70 g di pane integrale tostato (100 g nei giorni di allenamento)",
      "220 g di pesce fresco o surgelato, spinaci + 2 cucchiaini di olio evo + 70 g di pane integrale tostato",
      "3 uova strapazzate (2 tuorli e 3 albumi), funghi + 2 cucchiaini di olio evo + 70 g di pane integrale tostato",
      "250 g di pesce fresco o surgelato, carote + 2 cucchiaini di olio evo + 70 g di pane integrale tostato",
      "150 g di maiale magro (lonza), lattuga + 2 cucchiaini di olio evo + 250 g di patate lesse o al forno",
      "Pizza margherita, marinara o con verdure (o cena libera con moderazione)",
      "160 g di petto di tacchino, carote + 2 cucchiaini di olio evo + 70 g di pane integrale tostato",
    ],
  },
];

const UI_STATE_STORAGE_KEY = "piano-alimentare-ui-state";
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const rangeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

const state = {
  today: startOfDay(new Date()),
  visibleWeekStart: loadVisibleWeekStart(),
  entries: {},
  isLoading: true,
  error: "",
  saveQueue: Promise.resolve(),
};

const calendarGrid = document.getElementById("calendarGrid");
const weekdaysNode = document.getElementById("weekdays");
const weekRangeLabel = document.getElementById("weekRangeLabel");
const mealLibrary = document.getElementById("mealLibrary");

document.getElementById("prevWeek").addEventListener("click", () => shiftWeek(-1));
document.getElementById("nextWeek").addEventListener("click", () => shiftWeek(1));
document.getElementById("goToday").addEventListener("click", () => {
  state.visibleWeekStart = startOfWeek(new Date());
  persistUiState();
  renderApp();
});

initializeApp();

async function initializeApp() {
  renderWeekdays();
  renderMealLibrary();
  renderLoadingState();

  try {
    await loadEntriesFromServer();
    state.error = "";
  } catch (error) {
    state.error = error.message || "Unable to load data from the server.";
  } finally {
    state.isLoading = false;
    renderApp();
  }
}

function renderApp() {
  renderWeekdays();
  renderWeek();
  renderMealLibrary();
}

function renderLoadingState() {
  weekRangeLabel.textContent = "Loading...";
  calendarGrid.innerHTML = '<p class="empty-state">Loading data from the database...</p>';
}

function renderWeekdays() {
  weekdaysNode.innerHTML = weekdays.map((day) => `<div class="weekday">${day}</div>`).join("");
}

function renderWeek() {
  const dates = getVisibleWeekDates();
  const weekEnd = new Date(state.visibleWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekRangeLabel.textContent = `${capitalize(rangeFormatter.format(state.visibleWeekStart))} - ${rangeFormatter.format(weekEnd)}`;

  if (state.error) {
    calendarGrid.innerHTML = `<p class="empty-state">${escapeHtml(state.error)}</p>`;
    return;
  }

  calendarGrid.innerHTML = dates.map((date) => createDayColumn(date)).join("");

  calendarGrid.querySelectorAll("[data-date-key]").forEach((column) => {
    const date = fromDateKey(column.dataset.dateKey);

    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      column.classList.add("drag-over");
    });

    column.addEventListener("dragleave", () => {
      column.classList.remove("drag-over");
    });

    column.addEventListener("drop", (event) => {
      event.preventDefault();
      column.classList.remove("drag-over");
      const raw = event.dataTransfer.getData("text/plain");
      if (!raw) {
        return;
      }

      const payload = JSON.parse(raw);
      queueSave(date, payload.sectionId, payload.option);
    });
  });

  calendarGrid.querySelectorAll(".remove-entry-button").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const date = fromDateKey(button.dataset.dateKey);
      removeEntry(date, button.dataset.sectionId, Number(button.dataset.entryIndex));
    });
  });
}

function createDayColumn(date) {
  const dateKey = toDateKey(date);
  const dayEntries = state.entries[dateKey] || {};
  const sectionsMarkup = mealSections
    .map((section) => {
      const values = normalizeSectionValues(dayEntries[section.id]);
      const contentMarkup = values.length
        ? values
            .map(
              (value, index) => `
                <div class="slot-item">
                  <span class="slot-item-text">${escapeHtml(value)}</span>
                  <button class="remove-entry-button" type="button" data-date-key="${dateKey}" data-section-id="${section.id}" data-entry-index="${index}">Remove</button>
                </div>
              `
            )
            .join("")
        : '<div class="slot-value empty">Drag here</div>';
      return `
        <div class="day-slot">
          <p class="slot-label">${section.label}</p>
          <div class="slot-list">${contentMarkup}</div>
        </div>
      `;
    })
    .join("");

  return `
    <article class="day-column ${isSameDay(date, state.today) ? "today" : ""}" data-date-key="${dateKey}">
      <div class="day-column-header">
        <p class="day-name">${capitalize(shortDateFormatter.format(date))}</p>
      </div>
      <div class="day-slots">${sectionsMarkup}</div>
    </article>
  `;
}

function renderMealLibrary() {
  const weeklyUsage = getWeeklyOptionUsage();

  mealLibrary.innerHTML = mealSections
    .map((section) => {
      const items = section.options
        .map((option) => {
          const usage = weeklyUsage.get(`${section.id}::${option}`) || { count: 0, days: [] };
          const tooltip = usage.days.length
            ? usage.days.map((day) => capitalize(shortDateFormatter.format(day))).join(", ")
            : "Never used this week";
          const countMarkup =
            usage.count > 0
              ? `<span class="drag-item-count ${usage.count > 1 ? "is-repeated" : ""}" title="${escapeHtml(tooltip)}">${usage.count}</span>`
              : "";
          return `
            <button
              class="drag-item"
              type="button"
              draggable="true"
              data-section-id="${section.id}"
              data-option="${escapeHtml(option)}"
              title="Drag onto a day to assign this option to ${section.label.toLowerCase()}"
            >
              <span class="drag-item-content">${option}</span>
              ${countMarkup}
            </button>
          `;
        })
        .join("");

      return `
        <section class="library-section">
          <div class="meal-card-header">
            <h3>${section.label}</h3>
            <p>${section.note}</p>
          </div>
          <div class="library-items">${items}</div>
        </section>
      `;
    })
    .join("");

  mealLibrary.querySelectorAll(".drag-item").forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      const payload = {
        sectionId: item.dataset.sectionId,
        option: item.dataset.option,
      };
      event.dataTransfer.setData("text/plain", JSON.stringify(payload));
      event.dataTransfer.effectAllowed = "copy";
    });
  });
}

function getWeeklyOptionUsage() {
  const dates = getVisibleWeekDates();
  const usage = new Map();

  for (const section of mealSections) {
    for (const date of dates) {
      const dateKey = toDateKey(date);
      const chosenOptions = normalizeSectionValues(state.entries[dateKey]?.[section.id]);
      for (const chosenOption of chosenOptions) {
        const key = `${section.id}::${chosenOption}`;
        const current = usage.get(key) || { count: 0, days: [] };
        current.count += 1;
        current.days.push(new Date(date));
        usage.set(key, current);
      }
    }
  }

  return usage;
}

function shiftWeek(direction) {
  const nextWeek = new Date(state.visibleWeekStart);
  nextWeek.setDate(nextWeek.getDate() + direction * 7);
  state.visibleWeekStart = startOfWeek(nextWeek);
  persistUiState();
  renderApp();
}

function queueSave(date, sectionId, option) {
  appendLocalChange(date, sectionId, option);
  renderWeek();
  renderMealLibrary();

  state.saveQueue = state.saveQueue
    .then(() => saveDayToServer(date))
    .catch((error) => {
      state.error = error.message || "Unable to save to the database.";
      renderApp();
    });
}

function appendLocalChange(date, sectionId, option) {
  const dateKey = toDateKey(date);
  const existing = cloneDayEntries(state.entries[dateKey] || {});
  existing[sectionId] = [...normalizeSectionValues(existing[sectionId]), option];
  const cleaned = pruneEmptySections(existing);

  if (Object.keys(cleaned).length === 0) {
    delete state.entries[dateKey];
  } else {
    state.entries[dateKey] = cleaned;
  }
}

function removeEntry(date, sectionId, entryIndex) {
  const dateKey = toDateKey(date);
  const existing = cloneDayEntries(state.entries[dateKey] || {});
  const values = normalizeSectionValues(existing[sectionId]);
  if (entryIndex < 0 || entryIndex >= values.length) {
    return;
  }

  values.splice(entryIndex, 1);
  if (values.length) {
    existing[sectionId] = values;
  } else {
    delete existing[sectionId];
  }

  const cleaned = pruneEmptySections(existing);
  if (Object.keys(cleaned).length === 0) {
    delete state.entries[dateKey];
  } else {
    state.entries[dateKey] = cleaned;
  }

  renderWeek();
  renderMealLibrary();
  state.saveQueue = state.saveQueue
    .then(() => saveDayToServer(date))
    .catch((error) => {
      state.error = error.message || "Unable to save to the database.";
      renderApp();
    });
}

async function loadEntriesFromServer() {
  const response = await fetch("/api/entries");
  if (!response.ok) {
    throw new Error("The server could not read data from the database.");
  }

  const payload = await response.json();
  state.entries = normalizeEntries(payload.entries || {});
}

async function saveDayToServer(date) {
  const response = await fetch("/api/day", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      date: toDateKey(date),
      sections: state.entries[toDateKey(date)] || {},
    }),
  });

  if (!response.ok) {
    throw new Error("Saving to the database failed.");
  }
}

function getVisibleWeekDates() {
  return Array.from({ length: 7 }, (_, index) => {
    const item = new Date(state.visibleWeekStart);
    item.setDate(state.visibleWeekStart.getDate() + index);
    return startOfDay(item);
  });
}

function normalizeEntries(rawEntries) {
  const normalized = {};
  for (const [dateKey, sections] of Object.entries(rawEntries || {})) {
    const normalizedSections = {};
    for (const [sectionId, value] of Object.entries(sections || {})) {
      const items = normalizeSectionValues(value);
      if (items.length) {
        normalizedSections[sectionId] = items;
      }
    }
    if (Object.keys(normalizedSections).length) {
      normalized[dateKey] = normalizedSections;
    }
  }
  return normalized;
}

function normalizeSectionValues(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item);
  }
  if (typeof value === "string" && value) {
    return [value];
  }
  return [];
}

function cloneDayEntries(dayEntries) {
  return Object.fromEntries(
    Object.entries(dayEntries).map(([sectionId, value]) => [sectionId, [...normalizeSectionValues(value)]])
  );
}

function pruneEmptySections(dayEntries) {
  return Object.fromEntries(
    Object.entries(dayEntries).filter(([, value]) => normalizeSectionValues(value).length > 0)
  );
}

function loadVisibleWeekStart() {
  try {
    const raw = localStorage.getItem(UI_STATE_STORAGE_KEY);
    if (!raw) {
      return startOfWeek(new Date());
    }

    const payload = JSON.parse(raw);
    if (!payload.visibleWeekStart || typeof payload.visibleWeekStart !== "string") {
      return startOfWeek(new Date());
    }

    return startOfWeek(fromDateKey(payload.visibleWeekStart));
  } catch {
    return startOfWeek(new Date());
  }
}

function persistUiState() {
  localStorage.setItem(
    UI_STATE_STORAGE_KEY,
    JSON.stringify({
      visibleWeekStart: toDateKey(state.visibleWeekStart),
    })
  );
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const day = (date.getDay() + 6) % 7;
  const result = startOfDay(date);
  result.setDate(result.getDate() - day);
  return result;
}

function toDateKey(date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromDateKey(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
