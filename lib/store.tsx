"use client";

/**
 * Active astronaut + demo session.
 *
 * The seeded JSON never changes. Anything done during a demo (a daily
 * check-in, a PHQ-9 or GAD-7, a cognitive observation) is kept in a
 * SessionOverlay in localStorage under `bayou-nova:v2:{astronautId}` and
 * merged on top of the seeded data by lib/session.ts. "Reset demo" clears it.
 *
 * Every screen reads the merged data and the detection result from here, so a
 * red flag reported in a check-in shows on every route straight away.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { evaluateDetection, type DetectionResult } from "./detection";
import {
  isAstronautId,
  loadAstronaut,
  type AstronautData,
  type AstronautId,
  type Checkin,
  type CognitiveResult,
  type QuestionnaireResult,
} from "./health-data";
import { applySession, emptyOverlay, isEmptyOverlay, type SessionOverlay } from "./session";

const ACTIVE_KEY = "bayou-nova:v1:active";
const overlayKey = (id: AstronautId) => `bayou-nova:v2:${id}`;

function readOverlay(id: AstronautId): SessionOverlay {
  try {
    const raw = window.localStorage.getItem(overlayKey(id));
    if (!raw) return emptyOverlay();
    const parsed = JSON.parse(raw) as SessionOverlay;
    return parsed.version === 2 ? { ...emptyOverlay(), ...parsed } : emptyOverlay();
  } catch {
    return emptyOverlay();
  }
}

function writeOverlay(id: AstronautId, overlay: SessionOverlay) {
  try {
    window.localStorage.setItem(overlayKey(id), JSON.stringify(overlay));
  } catch {
    /* storage unavailable (private mode): the demo still works for this page view */
  }
}

interface StoreValue {
  /** False until localStorage has been read on the client */
  ready: boolean;
  activeId: AstronautId | null;
  /** Seeded data for the active astronaut merged with this session's additions */
  data: AstronautData | null;
  /** Both detection layers, evaluated on `data`. Layer 1 first, always. */
  detection: DetectionResult | null;
  overlay: SessionOverlay;
  /** True when this session has added anything for the active astronaut */
  hasSessionData: boolean;
  selectAstronaut: (id: AstronautId) => void;
  clearAstronaut: () => void;
  saveCheckin: (checkin: Checkin) => void;
  saveQuestionnaire: (result: QuestionnaireResult) => void;
  saveCognitive: (result: CognitiveResult) => void;
  /** Ticks or unticks one step of the follow-up plan */
  toggleActionCheck: (id: string) => void;
  /** Clears this session's additions for the active astronaut */
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState<AstronautId | null>(null);
  const [overlay, setOverlay] = useState<SessionOverlay>(emptyOverlay);

  // Read the remembered astronaut once on the client.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ACTIVE_KEY);
      if (isAstronautId(stored)) {
        setActiveId(stored);
        setOverlay(readOverlay(stored));
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const selectAstronaut = useCallback((id: AstronautId) => {
    setActiveId(id);
    setOverlay(readOverlay(id));
    try {
      window.localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const clearAstronaut = useCallback(() => {
    setActiveId(null);
    setOverlay(emptyOverlay());
    try {
      window.localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const update = useCallback(
    (fn: (current: SessionOverlay) => SessionOverlay) => {
      if (!activeId) return;
      setOverlay((current) => {
        const next = fn(current);
        writeOverlay(activeId, next);
        return next;
      });
    },
    [activeId]
  );

  const saveCheckin = useCallback(
    (checkin: Checkin) => update((o) => ({ ...o, checkins: [...o.checkins, checkin] })),
    [update]
  );
  const saveQuestionnaire = useCallback(
    (result: QuestionnaireResult) => update((o) => ({ ...o, questionnaires: [...o.questionnaires, result] })),
    [update]
  );
  const saveCognitive = useCallback(
    (result: CognitiveResult) => update((o) => ({ ...o, cognitive: [...o.cognitive, result] })),
    [update]
  );

  const toggleActionCheck = useCallback(
    (id: string) =>
      update((o) => ({
        ...o,
        actionChecks: o.actionChecks.includes(id) ? o.actionChecks.filter((x) => x !== id) : [...o.actionChecks, id],
      })),
    [update]
  );

  const resetDemo = useCallback(() => {
    if (!activeId) return;
    const fresh = emptyOverlay();
    setOverlay(fresh);
    writeOverlay(activeId, fresh);
  }, [activeId]);

  const data = useMemo(
    () => (activeId ? applySession(loadAstronaut(activeId), overlay) : null),
    [activeId, overlay]
  );
  const detection = useMemo(() => (data ? evaluateDetection(data) : null), [data]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      activeId,
      data,
      detection,
      overlay,
      hasSessionData: !isEmptyOverlay(overlay),
      selectAstronaut,
      clearAstronaut,
      saveCheckin,
      saveQuestionnaire,
      saveCognitive,
      toggleActionCheck,
      resetDemo,
    }),
    [ready, activeId, data, detection, overlay, selectAstronaut, clearAstronaut, saveCheckin, saveQuestionnaire, saveCognitive, toggleActionCheck, resetDemo]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** The active astronaut's data (seeded + session), or null before one is chosen. */
export function useAstronautData(): AstronautData | null {
  return useStore().data;
}

/** Both detection layers for the active astronaut, or null before one is chosen. */
export function useDetection(): DetectionResult | null {
  return useStore().detection;
}
