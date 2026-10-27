import type {
  Agent,
  Client,
  ComboTemplate,
  CommissionRow,
  FollowUp,
  Lead,
  MessageLog,
  MessageTemplate,
  NotificationItem,
  Plan,
  Policy,
  Quotation,
  RateRow,
} from "../types/models";
import policyBook from "./policyBook.json";

export const seedAgent: Agent = {
  name: "",
  firstName: "",
  code: "",
  branch: "",
  phone: "",
  email: "",
  yearlyTarget: 2500000,
  emailReminders: true,
  whatsappReminders: true,
  browserNotifications: false,
};

export const seedPlans: Plan[] = [
  {
    code: "914",
    name: "New Endowment Plan",
    category: "Endowment",
    minAge: 8,
    maxAge: 55,
    terms: [12, 15, 20, 25, 30, 35],
    blurb:
      "Savings + protection with participating bonus and Final Additional Bonus. Entry age 8 – 55 . Figures are indicative sample values, not official LIC quotes.",
  },
  {
    code: "936",
    name: "Jeevan Labh",
    category: "Endowment",
    minAge: 8,
    maxAge: 59,
    terms: [16, 21, 25],
    blurb: "Limited premium paying endowment with high maturity potential.",
  },
  {
    code: "920",
    name: "New Money Back Plan - 20 Years",
    category: "Money-Back",
    minAge: 13,
    maxAge: 50,
    terms: [20],
    blurb: "Periodic survival benefits every 5 years plus maturity.",
  },
  {
    code: "921",
    name: "New Money Back Plan - 25 Years",
    category: "Money-Back",
    minAge: 13,
    maxAge: 45,
    terms: [25],
    blurb: "Liquidity at regular intervals with life cover throughout.",
  },
  {
    code: "904",
    name: "Jeevan Umang (Whole Life)",
    category: "Whole Life",
    minAge: 3,
    maxAge: 55,
    terms: [15, 20, 25, 30],
    blurb: "Annual survival benefit of 8% of sum assured till age 100.",
  },
  {
    code: "876",
    name: "SIIP (Unit Linked)",
    category: "ULIP",
    minAge: 18,
    maxAge: 65,
    terms: [10, 15, 20, 25],
    blurb: "Market-linked growth with life cover and fund switching.",
  },
  {
    code: "955",
    name: "Jeevan Amar (Term)",
    category: "Term",
    minAge: 18,
    maxAge: 65,
    terms: [10, 20, 30, 40],
    blurb: "Pure risk cover at low cost, level or increasing sum assured.",
  },
  {
    code: "857",
    name: "Jeevan Shanti (Pension)",
    category: "Pension",
    minAge: 30,
    maxAge: 79,
    terms: [10, 15, 20],
    blurb: "Deferred/immediate annuity with guaranteed pension rates.",
  },
  {
    code: "859",
    name: "Bhagya Lakshmi (Micro)",
    category: "Micro-Insurance",
    minAge: 18,
    maxAge: 55,
    terms: [10, 13, 15],
    blurb: "Low ticket-size protection plan for rural and micro segments.",
  },
];

function grid(
  planCode: string,
  term: number,
  age20: number,
  step: number,
): RateRow[] {
  const ages = [20, 25, 30, 35, 40, 45, 50];
  return ages.map((age, i) => ({
    planCode,
    age,
    term,
    ratePerThousand: Number((age20 + i * step).toFixed(2)),
    effectiveDate: "2026-04-01",
    source: "Placeholder sample data",
  }));
}

export const seedRates: RateRow[] = [
  ...grid("914", 12, 116.67, 7),
  ...grid("914", 15, 93.33, 5.6),
  ...grid("914", 20, 70.0, 4.2),
  ...grid("914", 25, 58.4, 3.5),
  ...grid("914", 30, 50.2, 3.1),
  ...grid("914", 35, 44.8, 2.8),
  ...grid("936", 16, 88.2, 4.8),
  ...grid("936", 21, 72.4, 4.1),
  ...grid("936", 25, 64.1, 3.6),
  ...grid("920", 20, 76.5, 4.0),
  ...grid("921", 25, 62.8, 3.4),
  ...grid("904", 15, 92.0, 4.6),
  ...grid("904", 20, 81.2, 4.0),
  ...grid("904", 25, 73.5, 3.6),
  ...grid("904", 30, 67.8, 3.2),
  ...grid("876", 10, 110.0, 2.0),
  ...grid("876", 15, 95.0, 1.8),
  ...grid("876", 20, 84.0, 1.6),
  ...grid("876", 25, 76.0, 1.5),
  ...grid("955", 10, 4.8, 0.35),
  ...grid("955", 20, 6.2, 0.4),
  ...grid("955", 30, 8.1, 0.5),
  ...grid("955", 40, 11.4, 0.7),
  ...grid("857", 10, 68.0, 1.2),
  ...grid("857", 15, 61.0, 1.1),
  ...grid("857", 20, 55.0, 1.0),
  ...grid("859", 10, 71.0, 2.2),
  ...grid("859", 13, 64.0, 2.0),
  ...grid("859", 15, 59.0, 1.8),
];

export const seedCommission: CommissionRow[] = seedPlans.flatMap((p) => {
  const y1 = p.category === "ULIP" ? 7.5 : 25;
  return [
    { planCode: p.code, planName: `${p.code} — ${p.name}`, years: "1", ratePct: y1, effectiveDate: "2026-04-01" },
    { planCode: p.code, planName: `${p.code} — ${p.name}`, years: "2-5", ratePct: 7.5, effectiveDate: "2026-04-01" },
    { planCode: p.code, planName: `${p.code} — ${p.name}`, years: "6+", ratePct: 5, effectiveDate: "2026-04-01" },
  ];
});

export const seedClients: Client[] = policyBook.clients as Client[];

export const seedPolicies: Policy[] = policyBook.policies as Policy[];

export const seedFollowUps: FollowUp[] = policyBook.followUps as FollowUp[];

export const seedLeads: Lead[] = [
  { id: "l1", name: "Vikram Rao", phone: "919811122233", source: "Referral", stage: "New", followUp: "2026-09-18", note: "" },
  { id: "l2", name: "Meera Joshi", phone: "919822233344", source: "Campaign", stage: "Contacted", followUp: "2026-09-19", note: "" },
  { id: "l3", name: "Arjun Menon", phone: "919833344455", source: "Cold", stage: "Needs Assessment", followUp: "2026-09-21", note: "" },
  { id: "l4", name: "Kavita Singh", phone: "919844455566", source: "Referral", stage: "Proposal Sent", followUp: "2026-09-20", note: "" },
  { id: "l5", name: "Deepak Shah", phone: "919855566677", source: "Campaign", stage: "Negotiation", followUp: "2026-09-23", note: "" },
  { id: "l6", name: "Nisha Verma", phone: "919866677788", source: "Referral", stage: "Converted", followUp: "2026-10-17", note: "" },
];

export const seedQuotations: Quotation[] = [];

export const seedComboTemplates: ComboTemplate[] = [
  { id: "t1", name: "Child education + term", planCodes: ["914", "955"] },
  { id: "t2", name: "Savings + ULIP", planCodes: ["936", "876"] },
];

export const seedTemplates: MessageTemplate[] = [
  {
    id: "tm1",
    name: "Birthday greeting",
    category: "Birthday",
    body: "Dear {client_name}, wishing you a very happy birthday! May the year ahead bring health and prosperity. — {agent_name}, LIC Agent",
  },
  {
    id: "tm2",
    name: "Premium due reminder",
    category: "Premium Due",
    body: "Dear {client_name}, your LIC premium of Rs {amount} is due on {due_date}. Please pay on time to keep your policy in force. — {agent_name}",
  },
  {
    id: "tm3",
    name: "Festival greeting",
    category: "Festival",
    body: "Dear {client_name}, warm festive greetings to you and your family from {agent_name}!",
  },
  {
    id: "tm4",
    name: "Follow-up nudge",
    category: "Follow-up",
    body: "Hello {client_name}, following up on the plan options we discussed. Shall I share a fresh quotation? — {agent_name}",
  },
  {
    id: "tm5",
    name: "Revival reminder",
    category: "Revival",
    body: "Dear {client_name}, your policy has lapsed. It can still be revived with interest. Reply and I will help you complete it. — {agent_name}",
  },
];

export const seedNotifications: NotificationItem[] = [
  {
    id: "nt1",
    title: "Policy book loaded",
    body: `${policyBook.stats.clients} clients · ${policyBook.stats.policies} policies from ${policyBook.source}`,
    date: policyBook.generatedAt,
  },
];

export const seedGlobalMessages: MessageLog[] = [];

export function cloneSeed() {
  return {
    agent: structuredClone(seedAgent),
    // Clients and policies always come from the DB via API — never hardcoded.
    // An empty array is the correct initial state for any logged-in user.
    clients: [] as Client[],
    policies: [] as Policy[],
    followUps: [] as FollowUp[],
    leads: structuredClone(seedLeads),
    quotations: structuredClone(seedQuotations),
    templates: structuredClone(seedTemplates),
    messages: structuredClone(seedGlobalMessages),
    comboDraft: [] as Quotation["lines"],
  };
}
