/**
 * Demo session overlay (pure functions).
 *
 * The seeded JSON never changes. Anything done during a demo (a new daily
 * check-in, a PHQ-9 or GAD-7, a cognitive observation) is kept in a
 * SessionOverlay in the browser and merged on top here. "Reset demo" clears it.
 */

import { deriveIndices } from "./checkin";
import type {
  AstronautData,
  Checkin,
  CognitiveResult,
  DailyReading,
  QuestionnaireResult,
} from "./health-data";

export interface SessionOverlay {
  version: 2;
  checkins: Checkin[];
  questionnaires: QuestionnaireResult[];
  cognitive: CognitiveResult[];
  /** Ids of the follow-up plan steps ticked off in this session (Phase 7). */
  actionChecks: string[];
}

export function emptyOverlay(): SessionOverlay {
  return { version: 2, checkins: [], questionnaires: [], cognitive: [], actionChecks: [] };
}

export function isEmptyOverlay(o: SessionOverlay): boolean {
  return !hasHealthData(o) && !o.actionChecks.length;
}

/** True when the overlay changes the health data itself (not only plan tick-boxes). */
function hasHealthData(o: SessionOverlay): boolean {
  return !!(o.checkins.length || o.questionnaires.length || o.cognitive.length);
}

/**
 * Seeded data + session overlay.
 *  - A session check-in replaces the seeded check-in for the same mission day
 *    (the latest one wins), and that day's derived indices are recomputed from
 *    the new answers so charts and detection agree with what was reported.
 *  - Returns the seeded object itself when there is nothing to merge.
 */
export function applySession(base: AstronautData, overlay: SessionOverlay): AstronautData {
  // Ticking a follow-up step changes no reading, so the seeded object is returned as is.
  if (!hasHealthData(overlay)) return base;

  const latestByDay = new Map<number, Checkin>();
  for (const c of overlay.checkins) latestByDay.set(c.mission_day, c);

  const checkins = base.checkins.filter((c) => !latestByDay.has(c.mission_day));
  checkins.push(...Array.from(latestByDay.values()));
  checkins.sort((x, y) => x.mission_day - y.mission_day);

  const readings: DailyReading[] = base.readings.map((r) => {
    const c = latestByDay.get(r.mission_day);
    if (!c) return r;
    return { ...r, ...deriveIndices(c.answers), score_source: "checkin_derived" };
  });

  return {
    ...base,
    checkins,
    readings,
    questionnaires: [...overlay.questionnaires],
    cognitive: [...overlay.cognitive],
    hasSessionCheckin: latestByDay.size > 0,
  };
}
