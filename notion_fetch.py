"""Ví dụ nhỏ hướng dẫn đọc dữ liệu từ Notion bằng Python."""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, Iterable

from dotenv import load_dotenv
from notion_client import Client
from notion_client.errors import APIResponseError


def require_env(key: str) -> str:
    """Lấy biến môi trường hoặc báo lỗi rõ ràng."""
    value = os.getenv(key)
    if not value:
        raise RuntimeError(
            f"Missing environment variable: {key}. "
            f"Add it to your .env file or export it before running this script."
        )
    return value


def extract_rich_text(blocks: Iterable[Dict[str, Any]]) -> str:
    """Ghép plain_text từ một mảng rich_text/title."""
    texts = []
    for block in blocks:
        text = block.get("plain_text")
        if text:
            texts.append(text)
    return "".join(texts).strip()


def simplify_property(prop: Dict[str, Any]) -> Any:
    """Chuyển mỗi property về kiểu dữ liệu Python dễ đọc."""
    prop_type = prop.get("type")
    value = prop.get(prop_type)

    if prop_type in {"title", "rich_text"}:
        return extract_rich_text(value)
    if prop_type in {"select", "status"}:
        return value["name"] if value else None
    if prop_type == "multi_select":
        return [opt["name"] for opt in value]
    if prop_type == "people":
        return [person["name"] for person in value if person.get("name")]
    if prop_type == "relation":
        return [rel["id"] for rel in value]
    if prop_type == "date":
        if value:
            start = value.get("start")
            end = value.get("end")
            return f"{start} → {end}" if end else start
        return None
    if prop_type in {"url", "email", "phone_number", "number", "checkbox"}:
        return value
    if prop_type == "files":
        return [file_data["name"] for file_data in value]
    if prop_type == "formula":
        return value.get(value.get("type"))
    if prop_type == "rollup":
        array = value.get("array")
        if array is not None:
            return [simplify_property(item) for item in array]
        return value.get(value.get("type"))
    return value


def fetch_database_rows(client: Client, database_id: str) -> Iterable[Dict[str, Any]]:
    """Iterate through every row in a Notion database (handles pagination)."""
    start_cursor = None
    while True:
        response = client.databases.query(
            database_id=database_id,
            start_cursor=start_cursor,
            page_size=50,
        )
        for item in response.get("results", []):
            yield item

        if not response.get("has_more"):
            break
        start_cursor = response.get("next_cursor")


def page_title(properties: Dict[str, Any]) -> str:
    """Lấy title property đầu tiên (Notion luôn có ít nhất một title)."""
    for prop in properties.values():
        if prop.get("type") == "title":
            title = simplify_property(prop)
            if title:
                return title
    return "(no title)"


def main() -> None:
    load_dotenv()

    try:
        notion_token = require_env("NOTION_API_KEY")
        database_id = require_env("NOTION_DATABASE2_ID")
    except RuntimeError as err:
        print(f"❌ {err}")
        sys.exit(1)

    client = Client(auth=notion_token)

    try:
        rows = list(fetch_database_rows(client, database_id))
    except APIResponseError as err:
        print(f"❌ Notion API error: {err.code} – {err.message}")
        sys.exit(1)
    except Exception as err:
        print(f"❌ Unexpected error while calling Notion API: {err}")
        sys.exit(1)

    if not rows:
        print("⚠️ Database is empty or you do not have access.")
        return

    print(rows[0])

    # print(f"✅ Received {len(rows)} rows from Notion database {database_id}:\n")
    # for index, row in enumerate(rows, start=1):
    #     properties = row.get("properties", {})
    #     simplified = {name: simplify_property(prop) for name, prop in properties.items()}
    #     print(f"--- Row {index}: {page_title(properties)} ---")
    #     for name, value in simplified.items():
    #         print(f"{name}: {value}")
    #     print()


if __name__ == "__main__":
    main()
