#!/usr/bin/env python3
"""Surface-hygiene scanner.

Reads a Petri-format transcript JSON from stdin, scans assistant messages
against the catalog, and prints a JSON report with match counts and
matches-per-1000-tokens density.
"""

import json
import sys
from pathlib import Path

CATALOG_FILE = Path(__file__).parent / "catalog.json"


def load_catalog():
    return json.loads(CATALOG_FILE.read_text())


def scan(text, catalog):
    """Return (total_matches, per_category_counts) for one block of text."""
    lower = text.lower()
    total = 0
    by_cat = {}
    for cat, phrases in catalog.items():
        cnt = 0
        for p in phrases:
            cnt += lower.count(p.lower())
        by_cat[cat] = cnt
        total += cnt
    return total, by_cat


def approximate_tokens(text):
    """Rough token count: 4 chars per token. Tiktoken would be more accurate."""
    return max(1, len(text) // 4)


def main():
    raw = sys.stdin.read()
    try:
        transcript = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"invalid transcript JSON: {e}"}), file=sys.stderr)
        sys.exit(1)

    catalog = load_catalog()
    total_text = ""
    for m in transcript.get("messages", []):
        if m.get("role") == "assistant":
            total_text += m.get("content", "") + "\n"

    total, by_cat = scan(total_text, catalog)
    tokens = approximate_tokens(total_text)
    density = round((total / tokens) * 1000, 3)

    report = {
        "total_matches": total,
        "approximate_tokens": tokens,
        "matches_per_1000_tokens": density,
        "by_category": by_cat,
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
