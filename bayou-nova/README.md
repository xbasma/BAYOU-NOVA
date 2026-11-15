# BAYOU-NOVA

Intelligent Astronaut Health Monitoring Platform — 2026 NASA Space Apps Challenge.

A proof of concept that runs entirely from local simulated JSON files. No database, no
authentication, no environment variables. **Not a medical device or production medical system.**
All data is fictional and labelled SIMULATED DEMONSTRATION DATA.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

| Command              | What it does                                                    |
| -------------------- | --------------------------------------------------------------- |
| `npm run dev`        | Development server                                              |
| `npm run build`      | Production build (also type-checks and lints)                   |
| `npm start`          | Serve the production build                                      |
| `npm run test:logic` | 53 logic checks, including proof that Layer 1 overrides Layer 2 |

## What is built

| Phase | Feature                                                                 | Where                               |
| ----- | ----------------------------------------------------------------------- | ----------------------------------- |
| 4     | Personal Health Profile                                                 | `/health`, `/health/profile`        |
| 4     | Health Monitoring Dashboard                                             | `/dashboard`, `/health/[metricId]`  |
| 5     | Intelligent Daily Questions (check-in, PHQ-9, GAD-7, cognitive task)    | `/check-in` and its sub-routes      |
| 5     | Early Detection (two layers)                                            | `/alerts`, `/alerts/[alertId]`      |
| 6     | Medical Assistant (chat, four response levels, protocol cards)          | `/assistant`                        |
| 7     | Spaceflight Hazard Awareness (Overview / By mission phase / Toolkit)    | `/learn`, `/learn/[hazardId]`       |
| 7     | Crew Health Awareness (environmental framing only, opt-in toggle)       | `/crew`                             |
| 7     | Action and Follow-Up (six-section plan from the detection result)       | `/actions`                          |

All eight features are built. Phase 8 added the welcome screen, footer, loading states and deployment (see `DEPLOYMENT.md`).

## Architecture

Data flow: `data/**/*.json` → `lib/health-data.ts` → `lib/session.ts` (adds this demo session) →
`lib/detection.ts` → `lib/store.tsx` → pages and components. The Medical Assistant (`lib/assistant.ts`)
reads the detection result; it adds nothing to it.

```
app/
  layout.tsx                 Fonts, StoreProvider, AppShell
  page.tsx                   Welcome / demo astronaut selector
  about/                     Methods, two-layer design, limitations
  (app)/layout.tsx           Astronaut guard + RedFlagBanner on every route
  (app)/dashboard  health  health/profile  health/[metricId]
  (app)/check-in             Hub
  (app)/check-in/daily       Daily check-in flow
  (app)/check-in/[instrument]  phq-9, gad-7
  (app)/check-in/cognitive   Two-minute cognitive observation
  (app)/alerts               Early Detection panel
  (app)/alerts/[alertId]     One criterion or one pattern in detail
  (app)/assistant            Medical Assistant chat
  (app)/learn                Hazard overview, mission phase, prevention toolkit (URL hash picks the tab)
  (app)/learn/[hazardId]     One hazard card as its own page
  (app)/crew                 Privacy note, signal indicators, environment, insight, opt-in
  (app)/actions              Follow-up plan: what changed, may suggest, check, do, contact Earth, improvement
components/
  assistant/  detection/  checkin/  dashboard/  health/  profile/  layout/  brand/  ui/  learn/  crew/
data/
  a-104/  b-209/             profile, readings, checkins, status (narrative context only)
  shared/detection-rules.json    Layer 1 criteria and the Layer 2 rule
  shared/sources.json            Every citation and how it was checked
  shared/checkin-questions.json  Questions, branches, safety check, index formulas
  shared/questionnaires.json     PHQ-9 and GAD-7 wording, bands, required note
  shared/detection-context.json  "Why might this be happening?" content
  shared/assistant-protocols.json  Pre-defined protocol cards for the serious level (fixed text)
  shared/assistant-content.json    Assistant wording, red-flag keyword screen, demo conversation
  shared/display-rules.json  field-definitions.json
  crew/crew-environment.json     Fictional habitat scenario: signals, 14 days of CO2, light, temperature, insight, opt-in
  shared/learn-content.json      Hazards, mission phases, toolkit. Every claim carries source ids
  shared/action-content.json     Wording and tick-box items for the follow-up plan
lib/
  learn.ts crew.ts actions.ts   Phase 7 pure modules (no React)
  health-data.ts   Loader and data types
  detection.ts     Both detection layers (pure functions)
  assistant.ts     Medical Assistant: red-flag screen, response levels, protocol cards (pure functions)
  checkin.ts       Branching, index formulas, building a check-in
  session.ts       Demo-session overlay merged over the seeded data
  health.ts        Dashboard and profile views; status comes from detection.ts
  store.tsx        Active astronaut, session overlay, merged data, detection result
```

- Alerts are computed, never stored. `status.json` holds narrative context only.
- The demo session lives in `localStorage` under `bayou-nova:v2:{astronautId}`. "Reset demo session"
  clears it. A check-in completed in the demo replaces the seeded Mission Day 34 check-in.

## The two detection layers

**Layer 1: published emergency red flags.** 15 criteria in three domains (cardiovascular, neurological,
psychological), each with its sources in `shared/sources.json`. Checked first, on the value or the
reported symptom itself. The code path never reads a personal baseline. Any one met gives a red alert
on every route. Label: "Based on published emergency criteria — [source]".

**Layer 2: experimental detection rule.** For each of 13 signals: is there a consistent direction over
the last 14 days (Mann-Kendall), or has the level stayed on one side of the astronaut's own Mission
Day 5 to 19 (Mann-Whitney)? One signal alone is Monitor. Investigate needs a combination pattern: one
stream plus at least one related stream. There is no percentage, points or standard-deviation cut-off.
Layer 2 can never raise Act. Label: "Experimental detection rule — this is not a validated clinical
detection method".

## The Medical Assistant

A chat in which every reply is a structured card with two quick actions ("Why might this be
happening?" and "When should I escalate?"). **No AI model writes any reply.** `lib/assistant.ts`
assembles each one by fixed rules from pre-written text and the live detection result, in this order:

1. **Red flags.** The message is screened for red-flag words and Layer 1 is read from the data. Either
   one gives the **serious** level: a pre-defined protocol card from `assistant-protocols.json`, labelled
   "This response follows: [sources]". This branch returns before any signal, pattern or baseline is
   read, and a mentioned red flag stays for the rest of the conversation.
2. Things the platform cannot interpret give **uncertain**: "This situation requires human medical
   judgement. Please contact your flight surgeon."
3. A topic the platform follows gives **moderate** (orange) when an experimental pattern involves it,
   otherwise **routine** (green or amber).
4. Anything else is **uncertain**. The assistant never guesses.

The keyword screen is BAYOU-NOVA's own word list and is not validated. It has no negation handling on
purpose, so "no chest pain" also shows the protocol card. A red flag typed in the chat does not raise
the app-wide Layer 1 banner; the card asks the astronaut to record it in the safety check.

B-209 opens with a pre-built conversation (sleep, headache and concentration at moderate level). Its
replies are produced live by the same rules. The conversation is kept in `sessionStorage` under
`bayou-nova:v2:assistant:{astronautId}`.

## Before any public demo

- No clinician has reviewed any protocol card, the keyword screen or any assistant wording.
- Only one red flag (difficulty breathing) has a published spaceflight emergency procedure, and only as
  a partial FOIA release hosted by a third party. Every other card follows guidance written for Earth.

- No clinician has reviewed any Layer 1 criterion or its wording. The UI says so.
- Almost all Layer 1 sources were written for people on Earth, not for spaceflight.
- Four statistics references in `sources.json` are still marked unverified.
- PHQ-9 and GAD-7 wording was checked against a clinical reproduction of the forms. Compare it with
  the developers' own copy.

## Phase 7 notes

- Learn: statements with a source id show source tags; a statement with none is labelled "BAYOU-NOVA note,
  pending clinical review" and a test checks it carries no statistic. Mission-phase boundaries are a
  platform convention, labelled as such.
- Crew: a fictional scenario, not linked to either astronaut. Indicators are words, never numbers. The
  usual range is each factor's own simulated reference window, not an engineering limit. The opt-in switch
  is a local preference only and is not cleared by Reset demo.
- Actions: derived from the live detection result. A published red flag gives the red-flag plan (protocol
  cards, no Layer 2 content). Otherwise an experimental plan, labelled as such. The plan starts on the first
  day the status left Normal (B-209: Mission Day 22) and the review day is 14 days later, which is the
  detection rule's own window, not a clinical interval. Tick-boxes are stored in the session overlay.

## Design system

Light "canvas" theme with dark aubergine surfaces; colours and fonts are described in the Phase 4
handoff. Status colours: green (Normal), amber (Monitor), orange (Investigate), red (Act).
`tailwind.config.ts` scans `./lib/**` because `lib/health.ts` builds status colour classes.

## Phase 8 notes

- Welcome screen: tagline as the H1, five-step workflow banner, two profile buttons, short description,
  SIMULATED DEMONSTRATION DATA badge. The five workflow icons (`WORKFLOW_STAGES` in `lib/nav.ts`) are reused in the footer.
- Footer icons link to Dashboard, Early detection, Assistant, Action plan and Follow-up once a profile is chosen
  (this is also how phone users reach Early detection and Actions).
- Loading: `LoadingState` (session read), `ChartFrame` (chart skeleton until Recharts can measure), `app/(app)/loading.tsx`.
- Transitions: `app/(app)/template.tsx` fades each screen in; Learn tabs fade and show a copper indicator.
  All motion is disabled under `prefers-reduced-motion`.
- B-209 is Monitor (amber) from Mission Day 22 and Investigate (orange) from Mission Day 26. It is Investigate on Day 34.
- Deployment: see `DEPLOYMENT.md`. No environment variables are needed.
