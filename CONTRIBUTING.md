# Contributing

## Setup

```bash
git clone https://github.com/thecandylane/no-glaze
cd no-glaze
python3 -m venv .venv
source .venv/bin/activate
pip install -r evals/requirements.txt
```

## Running tests

Node hooks + installer + composition + smoke:

```bash
node --test "tests/hooks/"*.js "tests/installer/"*.js "tests/composition/"*.js "tests/smoke/"*.js
```

Python scanner + scorer + adapter:

```bash
python3 -m pytest tests/installer/ tests/unit/
```

## Running evals

```bash
python3 evals/run.py --dataset all
```

Requires `$ANTHROPIC_API_KEY` for Petri's auditor / judge models AND for Pi to drive the target.

## What's in scope

- Tightening mechanism wording in `skills/no-glaze/SKILL.md` (with eval evidence the change is positive).
- Adding entries to the banned-phrase catalog in `evals/datasets/D-surface-hygiene/catalog.json`.
- Adding eval prompts to A and B (subject to maintainer review; quality > quantity).
- Adding new Dataset C scenarios (hand-crafted only — high bar).
- New PROVIDERS entries in `bin/install.js` for new runtimes (must demonstrate the skill activates end-to-end on that runtime).

## What's not in scope

- Behavioral changes that don't have an eval signal supporting them.
- Adding mechanisms that aren't in the design spec (`docs/DESIGN.md`) without first updating it.
- "Soft" mechanisms (e.g., "be polite") — that's the failure mode this skill exists to prevent.

## PR rules

- Tests must pass.
- Eval composite score must not regress unless the change is documented as a deliberate trade.
- README and INSTALL must stay accurate. If you add a flag, document it.
