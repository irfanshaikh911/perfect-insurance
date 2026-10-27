import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cloneSeed, seedComboTemplates, seedCommission, seedNotifications, seedPlans, seedRates } from "./seed";
import type {
  Agent,
  Client,
  Lead,
  LeadStage,
  MessageLog,
  MessageTemplate,
  Policy,
  PolicyStatus,
  PremiumMode,
  Quotation,
  QuotationLine,
} from "../types/models";
import { getStoredUser } from "../lib/auth";
import { getAgentClientsApi, getAgentPoliciesApi, type ApiClient, type ApiPolicy } from "../lib/agentApi";

const KEY_PREFIX = "lic-buddy-hub-v3";

type State = ReturnType<typeof cloneSeed>;

/**
 * Returns a user-scoped key so two different agents on the same
 * browser never share cached state (leads, quotations, templates…).
 */
function userKey(): string {
  const user = getStoredUser();
  return user ? `${KEY_PREFIX}-${user.id}` : `${KEY_PREFIX}-guest`;
}

/**
 * Load UI state for the CURRENT user only.
 * Clients and policies are intentionally NOT loaded from localStorage —
 * they always come live from the API so a new agent never sees stale data.
 */
function load(): State {
  const base = cloneSeed(); // always start with empty clients/policies
  try {
    const raw = localStorage.getItem(userKey());
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>;
      // Only restore non-data fields (leads, quotations, templates, messages)
      // so the API is always authoritative for clients/policies.
      return {
        ...base,
        agent: saved.agent ?? base.agent,
        leads: saved.leads ?? base.leads,
        followUps: saved.followUps ?? base.followUps,
        quotations: saved.quotations ?? base.quotations,
        templates: saved.templates ?? base.templates,
        messages: saved.messages ?? base.messages,
        comboDraft: saved.comboDraft ?? base.comboDraft,
      };
    }
  } catch {
    /* ignore */
  }
  return base;
}

function persist(state: State) {
  // Persist everything EXCEPT clients/policies (those live in the DB)
  const { clients: _c, policies: _p, ...rest } = state;
  localStorage.setItem(userKey(), JSON.stringify(rest));
}

function mapApiClient(ac: ApiClient): Client {
  return {
    id: ac.id,
    name: ac.name,
    phone: ac.phone || "",
    email: ac.email || "",
    dob: ac.dob || "1990-01-01",
    address: ac.address || "",
    tags: ["Imported"],
    autoReminders: true,
    family: [],
    notes: [],
    documents: [],
    messages: [],
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

function mapApiPolicy(ap: ApiPolicy): Policy {
  return {
    id: ap.id,
    clientId: ap.client_id,
    policyNumber: ap.policy_number,
    planCode: ap.plan_code,
    planName: ap.plan_name,
    sumAssured: ap.sum_assured,
    premium: ap.premium,
    mode: (ap.mode as PremiumMode) || "Yearly",
    dueDate: ap.fup || ap.dom || new Date().toISOString().slice(0, 10),
    status: (ap.status as PolicyStatus) || "Active",
  };
}

type Store = State & {
  plans: typeof seedPlans;
  rates: typeof seedRates;
  commission: typeof seedCommission;
  notifications: typeof seedNotifications;
  comboTemplates: typeof seedComboTemplates;
  isLoadingData: boolean;
  refreshAgentData: () => Promise<void>;
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
  const [isLoadingData, setIsLoadingData] = useState(false);

  const update = (fn: (s: State) => State) => {
    setState((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  };

  const refreshAgentData = useCallback(async () => {
    const user = getStoredUser();
    if (!user) return;

    setIsLoadingData(true);
    try {
      const [clientsRes, policiesRes] = await Promise.all([
        getAgentClientsApi(),
        getAgentPoliciesApi(),
      ]);

      update((s) => {
        const updatedAgent = {
          ...s.agent,
          name: user.name || s.agent.name,
          firstName: (user.name || s.agent.name).trim().split(/\s+/)[0],
          code: user.agent_code || s.agent.code,
          branch: user.branch || s.agent.branch,
          phone: user.phone || s.agent.phone,
          email: user.email || s.agent.email,
          yearlyTarget: user.yearly_target || s.agent.yearlyTarget,
        };

        const mappedClients = clientsRes.map(mapApiClient);
        const mappedPolicies = policiesRes.map(mapApiPolicy);

        return {
          ...s,
          agent: updatedAgent,
          clients: mappedClients,
          policies: mappedPolicies,
        };
      });
    } catch (err) {
      console.error("Failed to load agent records from server:", err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    refreshAgentData();
  }, [refreshAgentData]);

  const value = useMemo<Store>(
    () => ({
      ...state,
      plans: seedPlans,
      rates: seedRates,
      commission: seedCommission,
      notifications: seedNotifications,
      comboTemplates: seedComboTemplates,
      isLoadingData,
      refreshAgentData,
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
    [state, isLoadingData, refreshAgentData],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { STAGES };
