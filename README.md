# Meal Plan Tracker

A local-first weekly meal planner with a drag-and-drop interface, backed by a Python server and SQLite database.

## Getting started

```bash
python3 server.py
```

Then open [http://localhost:8000](http://localhost:8000).

You can override the port and database path with environment variables:

```bash
PORT=3000 DB_PATH=./my_meals.db python3 server.py
```

## How it works

The app displays a **weekly calendar view** with five meal slots per day: Breakfast, Morning snack, Lunch, Afternoon snack, and Dinner.

A **meal library** sidebar lists the available options for each slot, based on a nutritional plan. Drag an option from the library onto any day to assign it. Click an assigned meal to remove it (hover shows a red overlay).

Each option in the library shows a **usage counter** indicating how many times it has been used in the currently visible week. Repeated items are highlighted to help maintain variety.

The week view is navigable with previous/next buttons and a "Today" shortcut. The current day is visually highlighted. Meal sections (Breakfast, Lunch, etc.) are **vertically aligned** across all days using CSS subgrid.

## Tech stack

- **Frontend**: Vanilla HTML, CSS, and JavaScript (no build step, no dependencies)
- **Backend**: Python `http.server` with a custom request handler (`ThreadingHTTPServer`)
- **Database**: SQLite, stored as `meal_tracker.db` in the project directory

## API

| Method | Endpoint        | Description                          |
|--------|-----------------|--------------------------------------|
| GET    | `/api/entries`  | Returns all saved entries as JSON    |
| PUT    | `/api/day`      | Creates or updates entries for a day |

### PUT `/api/day` payload

```json
{
  "date": "2026-03-29",
  "sections": {
    "colazione": ["option text", "another option"],
    "pranzo": ["option text"]
  }
}
```

Sending an empty `sections` object deletes the day's entry.

### Section IDs

| ID                  | Label             |
|---------------------|-------------------|
| `colazione`         | Breakfast         |
| `spuntinoMattina`   | Morning snack     |
| `pranzo`            | Lunch             |
| `spuntinoPomeriggio`| Afternoon snack   |
| `cena`              | Dinner            |

## Project structure

```
meal-plan/
  index.html       — Single-page app shell
  styles.css       — All styling (responsive, compact desktop layout)
  app.js           — Client-side logic (rendering, drag-and-drop, API calls)
  server.py        — Python HTTP server with SQLite persistence
  meal_tracker.db  — SQLite database (auto-created on first run)
```

## Responsive layout

- **Desktop**: Two-panel layout with the calendar on the left and the meal library on the right. Compact spacing to fit all 7 days with aligned meal rows.
- **Tablet** (< 1180px): Single-column layout with the library below the calendar. Days shown in a 4-column grid.
- **Phone** (< 760px): Each day takes its own row for easy vertical scrolling.

## Note

This project was entirely vibe coded with [Claude Code](https://claude.ai/claude-code).
