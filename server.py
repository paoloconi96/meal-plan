from __future__ import annotations

import json
import os
import sqlite3
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("DB_PATH", BASE_DIR / "meal_tracker.db"))


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def normalize_sections(raw_sections: object) -> dict[str, list[str]]:
    if not isinstance(raw_sections, dict):
        return {}

    normalized: dict[str, list[str]] = {}
    for section_id, value in raw_sections.items():
        if not isinstance(section_id, str):
            continue

        if isinstance(value, str):
            cleaned = value.strip()
            if cleaned:
                normalized[section_id] = [cleaned]
            continue

        if isinstance(value, list):
            items = [item.strip() for item in value if isinstance(item, str) and item.strip()]
            if items:
                normalized[section_id] = items

    return normalized


def migrate_legacy_entries(connection: sqlite3.Connection) -> None:
    has_legacy_table = connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entries'"
    ).fetchone()
    if not has_legacy_table:
        return

    rows = connection.execute(
        "SELECT day, section_id, option_text FROM entries ORDER BY day, section_id"
    ).fetchall()

    grouped: dict[str, dict[str, list[str]]] = {}
    for row in rows:
        grouped.setdefault(row["day"], {}).setdefault(row["section_id"], []).append(row["option_text"])

    for day, sections in grouped.items():
        connection.execute(
            """
            INSERT INTO day_entries (day, payload_json)
            VALUES (?, ?)
            ON CONFLICT(day) DO UPDATE SET payload_json = excluded.payload_json
            """,
            (day, json.dumps(sections)),
        )

    connection.execute("DROP TABLE entries")


def load_entries(connection: sqlite3.Connection) -> dict[str, dict[str, list[str]]]:
    rows = connection.execute(
        "SELECT day, payload_json FROM day_entries ORDER BY day"
    ).fetchall()

    entries: dict[str, dict[str, list[str]]] = {}
    for row in rows:
        try:
            payload = json.loads(row["payload_json"])
        except json.JSONDecodeError:
            payload = {}
        entries[row["day"]] = normalize_sections(payload)

    return entries


def initialize_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS day_entries (
                day TEXT NOT NULL PRIMARY KEY,
                payload_json TEXT NOT NULL
            )
            """
        )
        migrate_legacy_entries(connection)


class MealTrackerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/entries":
            self.handle_get_entries()
            return
        super().do_GET()

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/day":
            self.handle_put_day()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint non trovato")

    def handle_get_entries(self) -> None:
        with get_connection() as connection:
            entries = load_entries(connection)
        self.send_json({"entries": entries})

    def handle_put_day(self) -> None:
        payload = self.read_json_body()
        day = payload.get("date")
        sections = normalize_sections(payload.get("sections"))

        if not isinstance(day, str):
            self.send_json({"error": "Payload non valido."}, status=HTTPStatus.BAD_REQUEST)
            return

        with get_connection() as connection:
            if sections:
                connection.execute(
                    """
                    INSERT INTO day_entries (day, payload_json)
                    VALUES (?, ?)
                    ON CONFLICT(day) DO UPDATE SET payload_json = excluded.payload_json
                    """,
                    (day, json.dumps(sections)),
                )
            else:
                connection.execute("DELETE FROM day_entries WHERE day = ?", (day,))

        self.send_json({"ok": True})

    def read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            return json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run() -> None:
    initialize_database()
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), MealTrackerHandler)
    print(f"Serving on http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    run()
