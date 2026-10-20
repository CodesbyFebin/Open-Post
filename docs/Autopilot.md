# Autopilot

Autopilot turns a topic queue into scheduled posts at fixed times of day.

## Settings

| Field | Meaning |
| --- | --- |
| `enabled` | When on, the scheduler fills empty slots every 5 minutes |
| `cadence` | `["09:00","13:00","17:30"]`, in server local time (`TZ`) |
| `horizonDays` | How many days ahead to plan (1–14) |
| `channelIds` | Where autopilot posts go |
| `persona` | `thought_leader`, `indie_hacker`, `technical_architect`, `contrarian_analyst`, `viral_storyteller` |
| `provider` | Override `AI_PROVIDER` just for autopilot |
| `topics` | `[{ "title": "...", "pillar": "Engineering", "evergreen": true }]` |
| `recycleEvergreen` | Reuse evergreen topics after the one-off topics run out |

## How slots are filled

1. Compute every future `cadence` time from now to `now + horizonDays`.
2. Skip slots that already have an autopilot post.
3. For each empty slot, pick the eligible topic with the lowest `usedCount`. Eligible means never used, or evergreen with recycling on.
4. Generate content with the selected provider, then schedule it.

If no topic is eligible, filling stops. Nothing is invented.

## Providers

| `AI_PROVIDER` | Needs |
| --- | --- |
| `heuristic` | Nothing. Deterministic, offline templates |
| `openai` | `OPENAI_API_KEY` (optionally `OPENAI_BASE_URL`) |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `gemini` | `GEMINI_API_KEY` |
| `ollama` | A running Ollama (`OLLAMA_URL`) with the model pulled, e.g. `ollama pull llama3.1` |

Providers are asked for JSON with a core post plus X, LinkedIn, Reddit and Bluesky variants. If the call fails or returns bad JSON, Open Post falls back to the heuristic engine and stores `meta.fallbackReason` on the post, so you can see what happened.

## Review before it goes out

Autopilot posts are ordinary scheduled posts. You can edit, reschedule or delete them in the **Queue** before they're due. If you want manual approval, keep `enabled` off and use **Generate one now** or **Fill slots now**, then review the queue.
