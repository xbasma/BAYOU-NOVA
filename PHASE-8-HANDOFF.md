# BAYOU-NOVA: Phase 8 handoff (final polish and deployment)

Status: Phases 1-8 complete. Latest code: `bayou-nova-full-phase8.zip`.
Run: `npm install`, `npm run dev`, http://localhost:3000. Checks: `npm run test:logic` (53 checks), `npm run build`.
Deploy: follow `DEPLOYMENT.md` (GitHub, then Vercel, no environment variables). Not yet deployed by Claude.

## What Phase 8 changed
- Welcome (`components/layout/WelcomeSelector.tsx`): tagline "Intelligent Health Monitoring for the Space Frontier" as the H1,
  five-step workflow banner, two profile buttons, description, SIMULATED DEMONSTRATION DATA badge.
- Footer (`components/layout/Footer.tsx`): five icons, one per workflow stage (`WORKFLOW_STAGES` in `lib/nav.ts`), linked to
  Dashboard, Early detection, Assistant, Action plan, Follow-up after a profile is chosen. Gives phones a route to /alerts and /actions.
- Polish: copper hairline on glass panels, ease-to-copper on buttons and tabs, `.btn-copper`, fade between screens
  (`app/(app)/template.tsx`), Learn tab fade and copper indicator, loading states (`LoadingState`, `ChartFrame`, `app/(app)/loading.tsx`),
  `app/error.tsx`, Open Graph metadata, `engines.node >= 18.17`. Banner text is upper-case SIMULATED DEMONSTRATION DATA.
- Accessibility fix: `/alerts/current` now has an h1.
- Tests: 6 new checks (53 total): both profiles load, B-209 status path, every dashboard chart has a baseline line, PHQ-9/GAD-7 notes,
  crew privacy note, every data file labelled.

## Demo check results (headless Chromium, 1440 px and 390 px)
23 scripted browser checks passed; 17 routes x 2 profiles x 2 widths: no console errors, no horizontal overflow, label and h1 on every page.
Screens were looked at by eye: welcome (both widths), dashboard and crew (phone), others by script only.

## Findings the team must know
1. B-209 is Investigate (orange) on Mission Day 34, not amber. It is Monitor (amber) MD22-25 and Investigate from MD26. This is the
   detection rule's output and was not changed. If the demo must open on amber, that needs a deliberate decision (e.g. a replay control), not a rule change.
2. "Five feature icons" was read as the five workflow stages (the app has eight features and six tabs). Reversible.
3. Threshold scan of all rendered text: every numeric clinical figure cites a source (HR >100, BP 180/120, 600 mSv, study findings);
   everything else is labelled experimental or "not a clinical threshold". The Actions page says sleep efficiency "back toward about 89%":
   that is the astronaut's own early-flight reference, not a clinical target.
4. Fonts and theme still differ from the original brief (Archivo and Syncopate, light canvas theme); kept per Phase 7.
5. All Phase 5-7 findings still stand, including: no clinician review of any wording, serious-sentence timing wording (Phase 6 finding 8),
   unverified Learn sources, 14-day review window is the rule's window.
6. The crew data file labels itself under `meta.label` rather than `_label`; both are accepted by the test.

## Not verified
- Not deployed: no GitHub push or Vercel deploy was done. The live URL is unconfirmed.
- Not checked in Safari, Firefox, or with a screen reader. Mobile checked at 390 px only; tablet widths not inspected.
- Tab transition smoothness and loading states were checked for errors, not judged on slow devices.

## Remaining
Deploy, then Supabase only after the clinical-review findings are settled. Candidate polish: clear opt-in on Reset, print view for the plan.
