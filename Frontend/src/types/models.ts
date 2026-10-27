export type PolicyStatus = "Active" | "Lapsed" | "Matured";
export type QuoteStatus = "Draft" | "Sent" | "Viewed" | "Accepted" | "Rejected";
export type LeadStage =
  | "New"
  | "Contacted"
  | "Needs Assessment"
  | "Proposal Sent"
  | "Negotiation"
  | "Converted"
  | "Lost";
export type LeadSource = "Referral" | "Campaign" | "Cold";
export type PremiumMode = "Yearly" | "Half-Yearly" | "Quarterly" | "Monthly";
export type MessageChannel = "WhatsApp" | "SMS" | "Email";
export type TemplateCategory = "Birthday" | "Premium Due" | "Festival" | "Follow-up" | "Revival";

export type Agent = {
  name: string;
  firstName: string;
  code: string;
  branch: string;
  phone: string;
  email: string;
  yearlyTarget: number;
  emailReminders: boolean;
  whatsappReminders: boolean;
  browserNotifications: boolean;
  avatar?: string;
};

export type FamilyMember = {
  name: string;
  relation: string;
  dob?: string;
};

export type Note = {
  id: string;
  date: string;
  text: string;
};

export type ClientDocument = {
  id: string;
  name: string;
  sizeLabel: string;
};

export type MessageLog = {
  id: string;
  title: string;
  channel: MessageChannel;
  date: string;
  clientId?: string;
};

export type Policy = {
  id: string;
  clientId: string;
  policyNumber?: string;
  planCode: string;
  planName: string;
  sumAssured: number;
  premium: number;
  mode: PremiumMode;
  dueDate: string;
  status: PolicyStatus;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  address: string;
  tags: string[];
  autoReminders: boolean;
  family: FamilyMember[];
  notes: Note[];
  documents: ClientDocument[];
  messages: MessageLog[];
  createdAt: string;
};

export type FollowUp = {
  id: string;
  clientId: string;
  text: string;
  done: boolean;
};

export type Lead = {
  id: string;
  name: string;
  phone: string;
  source: LeadSource;
  stage: LeadStage;
  followUp: string;
  note: string;
};

export type QuotationLine = {
  planCode: string;
  planName: string;
  age: number;
  term: number;
  sumAssured: number;
  yearlyPremium: number;
  commission: number;
  maturity: number;
};

export type Quotation = {
  id: string;
  clientId: string | null;
  clientName: string;
  created: string;
  validTill: string;
  status: QuoteStatus;
  lines: QuotationLine[];
};

export type ComboTemplate = {
  id: string;
  name: string;
  planCodes: string[];
};

export type Plan = {
  code: string;
  name: string;
  category: string;
  minAge: number;
  maxAge: number;
  terms: number[];
  blurb: string;
};

export type RateRow = {
  planCode: string;
  age: number;
  term: number;
  ratePerThousand: number;
  effectiveDate: string;
  source: string;
};

export type CommissionRow = {
  planCode: string;
  planName: string;
  years: string;
  ratePct: number;
  effectiveDate: string;
};

export type MessageTemplate = {
  id: string;
  name: string;
  category: TemplateCategory;
  body: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  date: string;
};
