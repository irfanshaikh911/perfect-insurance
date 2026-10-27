import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { cloneSeed, seedComboTemplates, seedCommission, seedNotifications, seedPlans, seedRates } from "./seed";
import type {
  Agent,
  Client,
  Lead,
  LeadStage,
  MessageLog,
  MessageTemplate,
  Policy,
  Quotation,
  QuotationLine,
} from "../types/models";

const KEY = "lic-buddy-hub-state-v2";

type State = ReturnType<typeof cloneSeed>;

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* ignore */
  }
  return cloneSeed();
}

function persist(state: State) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

type Store = State & {
  plans: typeof seedPlans;
  rates: typeof seedRates;
  commission: typeof seedCommission;
  notifications: typeof seedNotifications;
  comboTemplates: typeof seedComboTemplates;
  saveAgent: (agent: Agent) => void;
  addClient: (client: Client, policy?: Policy) => void;
  addNote: (clientId: string, text: string) => void;
  toggleReminders: (clientId: string) => void;
  importClients: (rows: Client[], policies: Policy[]) => void;
  markFollowUpDone: (id: string) => void;
  addLead: (lead: Lead) => void;
  moveLead: (id: string, dir: -1 | 1) => void;
  addQuoteLine: (line: QuotationLine) => void;
  clearDraft: () => void;
  saveQuotation: (q: Quotation) => void;
  addTemplate: (t: MessageTemplate) => void;
  logMessage: (m: MessageLog) => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

const STAGES: LeadStage[] = [
  "New",
  "Contacted",
  "Needs Assessment",
  "Proposal Sent",
  "Negotiation",
  "Converted",
  "Lost",
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);

  const update = (fn: (s: State) => State) => {
    setState((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  };

  const value = useMemo<Store>(
    () => ({
      ...state,
      plans: seedPlans,
      rates: seedRates,
      commission: seedCommission,
      notifications: seedNotifications,
      comboTemplates: seedComboTemplates,
      saveAgent: (agent) => update((s) => ({ ...s, agent })),
      addClient: (client, policy) =>
        update((s) => ({
          ...s,
          clients: [client, ...s.clients],
          policies: policy ? [policy, ...s.policies] : s.policies,
        })),
      addNote: (clientId, text) =>
        update((s) => ({
          ...s,
          clients: s.clients.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  notes: [
                    { id: `n${Date.now()}`, date: new Date().toISOString().slice(0, 10), text },
                    ...c.notes,
                  ],
                }
              : c,
          ),
        })),
      toggleReminders: (clientId) =>
        update((s) => ({
          ...s,
          clients: s.clients.map((c) =>
            c.id === clientId ? { ...c, autoReminders: !c.autoReminders } : c,
          ),
        })),
      importClients: (rows, policies) =>
        update((s) => ({ ...s, clients: [...rows, ...s.clients], policies: [...policies, ...s.policies] })),
      markFollowUpDone: (id) =>
        update((s) => ({
          ...s,
          followUps: s.followUps.map((f) => (f.id === id ? { ...f, done: true } : f)),
        })),
      addLead: (lead) => update((s) => ({ ...s, leads: [lead, ...s.leads] })),
      moveLead: (id, dir) =>
        update((s) => ({
          ...s,
          leads: s.leads.map((l) => {
            if (l.id !== id) return l;
            const i = STAGES.indexOf(l.stage);
            const next = STAGES[i + dir];
            return next ? { ...l, stage: next } : l;
          }),
        })),
      addQuoteLine: (line) => update((s) => ({ ...s, comboDraft: [...s.comboDraft, line] })),
      clearDraft: () => update((s) => ({ ...s, comboDraft: [] })),
      saveQuotation: (q) =>
        update((s) => ({ ...s, quotations: [q, ...s.quotations], comboDraft: [] })),
      addTemplate: (t) => update((s) => ({ ...s, templates: [t, ...s.templates] })),
      logMessage: (m) => update((s) => ({ ...s, messages: [m, ...s.messages] })),
      reset: () => {
        const fresh = cloneSeed();
        persist(fresh);
        setState(fresh);
      },
    }),
    [state],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { STAGES };
