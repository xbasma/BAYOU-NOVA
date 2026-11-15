"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlaskConical, PlayCircle, RotateCcw, SendHorizontal, ShieldAlert, Sparkles } from "lucide-react";
import NovaOrb from "@/components/brand/NovaOrb";
import { GlassSection, SimulatedBadge } from "@/components/health/Glass";
import ResponseCard from "@/components/assistant/ResponseCard";
import {
  ASSISTANT_NAME,
  demoConversation,
  HOW_IT_WORKS,
  MODERATE_LINE,
  openingSummary,
  PROTOCOL_CLINICAL_REVIEW,
  PROTOCOL_SOURCING_FINDING,
  runConversation,
  SCREEN_LABEL,
  SCREEN_NOTE,
  SERIOUS_LINE,
  SUGGESTION_NOTE,
  suggestionsFor,
  UNCERTAIN_LINE,
  type Message,
  type QuickAction,
  type Turn,
} from "@/lib/assistant";
import type { AstronautId } from "@/lib/health-data";
import { useStore } from "@/lib/store";

const storageKey = (id: AstronautId) => `bayou-nova:v2:assistant:${id}`;

/** The conversation is kept as the list of turns for this browser tab only. */
function readTurns(id: AstronautId): Turn[] | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(id));
    return raw ? (JSON.parse(raw) as Turn[]) : null;
  } catch {
    return null;
  }
}
function writeTurns(id: AstronautId, turns: Turn[]) {
  try {
    window.sessionStorage.setItem(storageKey(id), JSON.stringify(turns));
  } catch {
    /* storage unavailable: the conversation still works for this page view */
  }
}

const LEVELS = [
  {
    dot: "#2E9E5B",
    name: "Routine",
    text: "Green or amber. Plain-language context, follow-up questions, what to watch and for how long.",
  },
  {
    dot: "#E2680F",
    name: "Moderate",
    text: `Orange, dashed. An experimental pattern. Always ends: "${MODERATE_LINE}"`,
  },
  {
    dot: "#C8321F",
    name: "Serious",
    text: `Red. A published red flag. A pre-defined protocol card, never generated text. Always says: "${SERIOUS_LINE}"`,
  },
  {
    dot: "#6B5870",
    name: "Uncertain",
    text: `Grey, dashed. Beyond reliable interpretation. Always says: "${UNCERTAIN_LINE}"`,
  },
];

/**
 * Medical Assistant (Feature 5). A chat in which every reply is a structured
 * card produced by lib/assistant.ts. The component holds only the list of
 * turns; the replies are recomputed from the turns and the live detection
 * result, so they always agree with the rest of the app.
 */
export default function AssistantChat() {
  const { activeId, data, detection } = useStore();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loadedFor, setLoadedFor] = useState<AstronautId | null>(null);
  const [draft, setDraft] = useState("");
  const [scrollTo, setScrollTo] = useState<number | null>(null);
  const lastUserRef = useRef<HTMLLIElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const demo = activeId ? demoConversation(activeId) : null;

  // Load this astronaut's conversation. With none stored, the pre-built demo opens.
  useEffect(() => {
    if (!activeId) return;
    const stored = readTurns(activeId);
    setTurns(stored ?? demoConversation(activeId)?.turns ?? []);
    setLoadedFor(activeId);
    setDraft("");
  }, [activeId]);

  const commit = useCallback(
    (next: Turn[], scroll: boolean) => {
      if (!activeId) return;
      setTurns(next);
      writeTurns(activeId, next);
      if (scroll) setScrollTo(next.length);
    },
    [activeId]
  );

  const send = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      commit([...turns, { kind: "text", text: clean }], true);
      setDraft("");
    },
    [commit, turns]
  );
  const quick = useCallback(
    (action: QuickAction) => commit([...turns, { kind: "action", action }], true),
    [commit, turns]
  );

  const conversation = useMemo(
    () => (detection ? runConversation(turns, detection).messages : ([] as Message[])),
    [turns, detection]
  );

  // Bring a new exchange into view, starting at the astronaut's own message.
  useEffect(() => {
    if (scrollTo === null) return;
    lastUserRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setScrollTo(null);
  }, [scrollTo]);

  if (!activeId || !data || !detection || loadedFor !== activeId) return null;

  const messages = conversation;
  const isDemo =
    !!demo && turns.length >= demo.turns.length && demo.turns.every((t, i) => JSON.stringify(t) === JSON.stringify(turns[i]));
  const demoMessageCount = isDemo && demo ? demo.turns.length * 2 : 0;
  const suggestions = suggestionsFor(activeId);
  const lastAssistantId = messages.length ? messages[messages.length - 1].id : null;
  const lastUserIndex = messages.length - 2;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-label="Conversation with BAYOU-NOVA" className="min-w-0 space-y-4">
        {/* Opening: what the layers show before anything is asked. */}
        <div className="glass-panel flex items-start gap-4 p-4 sm:p-5">
          <NovaOrb size={56} status={detection.status} spin={false} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-sm font-semibold text-ink">{ASSISTANT_NAME}</p>
              <SimulatedBadge />
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/90">{openingSummary(data, detection)}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{HOW_IT_WORKS}</p>
          </div>
        </div>

        {isDemo && demo && (
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-dashed border-secondary/60 bg-secondary/[0.07] p-3">
            <p className="flex min-w-0 flex-1 items-start gap-2 text-xs leading-relaxed text-ink">
              <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden="true" />
              <span>
                <span className="font-semibold text-secondary">{demo.title}. </span>
                {demo.note}
              </span>
            </p>
          </div>
        )}

        <ol role="log" aria-live="polite" aria-label="Messages" className="space-y-4">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <li
                key={m.id}
                ref={i === lastUserIndex ? lastUserRef : undefined}
                className="flex scroll-mt-24 justify-end"
              >
                <div className="max-w-[88%] rounded-[18px_18px_4px_18px] bg-ink px-4 py-3 text-champagne sm:max-w-[75%]">
                  <p className="mb-0.5 text-[10.5px] font-semibold text-champagne/70">
                    {activeId}
                    {m.viaQuickAction ? " · quick action" : ""}
                    {i < demoMessageCount ? " · scripted" : ""}
                  </p>
                  <p className="text-sm leading-relaxed">{m.text}</p>
                </div>
              </li>
            ) : (
              <li key={m.id} className="max-w-full lg:max-w-[94%]">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                  <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  {ASSISTANT_NAME}
                </p>
                {m.response && (
                  <ResponseCard response={m.response} onQuickAction={quick} active={m.id === lastAssistantId} />
                )}
              </li>
            )
          )}
        </ol>

        {/* Composer */}
        <form
          className="glass-panel p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <label htmlFor="assistant-input" className="text-sm font-semibold text-ink">
            Describe what you notice, or ask about your signals
          </label>
          <div className="mt-2 flex items-end gap-2">
            <textarea
              id="assistant-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              rows={2}
              maxLength={600}
              placeholder="For example: I have been sleeping badly and getting headaches"
              className="min-h-[3rem] flex-1 resize-y rounded-xl border border-ink/20 bg-white/80 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/80 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-semibold text-champagne hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-ink"
            >
              <SendHorizontal className="h-4 w-4" aria-hidden="true" />
              Send
            </button>
          </div>

          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-ink/85">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden="true" />
            <span>
              Any red-flag word in your message brings up the protocol card first, whatever your data shows. Nothing typed
              here is sent anywhere.
            </span>
          </p>

          {suggestions.length > 0 && (
            <div className="mt-3 border-t border-ink/10 pt-3">
              <p className="text-xs font-semibold text-muted">Try one</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-ink/20 bg-white/60 px-3 py-1.5 text-xs font-medium text-ink hover:border-accent hover:text-accent"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{SUGGESTION_NOTE}</p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2 border-t border-ink/10 pt-3">
            <button
              type="button"
              onClick={() => {
                commit([], false);
                inputRef.current?.focus();
              }}
              disabled={turns.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 bg-white/60 px-3.5 py-1.5 text-xs font-semibold text-ink hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              New conversation
            </button>
            {demo && !isDemo && (
              <button
                type="button"
                onClick={() => commit(demo.turns, false)}
                className="inline-flex items-center gap-1.5 rounded-full border border-secondary/50 bg-secondary/10 px-3.5 py-1.5 text-xs font-semibold text-secondary hover:border-secondary"
              >
                <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Load the pre-built demo conversation
              </button>
            )}
          </div>
        </form>
      </section>

      {/* How to read the replies */}
      <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <GlassSection eyebrow="How to read a reply" title="Four response levels">
          <ul className="space-y-3">
            {LEVELS.map((l) => (
              <li key={l.name} className="flex gap-2.5">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.dot }} aria-hidden="true" />
                <p className="text-xs leading-relaxed text-ink/90">
                  <span className="font-semibold text-ink">{l.name}. </span>
                  {l.text}
                </p>
              </li>
            ))}
          </ul>
        </GlassSection>

        <GlassSection eyebrow="Safety rule" title="Red flags come first" icon={ShieldAlert}>
          <p className="flex items-start gap-2 rounded-lg border border-dashed border-secondary/60 bg-secondary/[0.07] px-3 py-2 text-xs font-semibold leading-snug text-secondary">
            <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{SCREEN_LABEL}</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink/90">{SCREEN_NOTE}</p>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-accent underline-offset-4 hover:underline">
              Where the protocol cards come from
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-ink/90">{PROTOCOL_SOURCING_FINDING}</p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-warning">{PROTOCOL_CLINICAL_REVIEW}</p>
          </details>
        </GlassSection>
      </aside>
    </div>
  );
}
