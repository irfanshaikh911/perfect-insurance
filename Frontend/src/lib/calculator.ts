import type { Plan, RateRow } from "../types/models";

const MODAL = { halfYearly: 0.51, quarterly: 0.26, monthly: 0.08833 };

function lookupRate(rows: RateRow[], planCode: string, age: number, term: number): number | null {
  const same = rows.filter((r) => r.planCode === planCode && r.term === term);
  if (!same.length) return null;
  const exact = same.find((r) => r.age === age);
  if (exact) return exact.ratePerThousand;
  const sorted = [...same].sort((a, b) => a.age - b.age);
  let lo = sorted[0];
  let hi = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].age <= age && sorted[i + 1].age >= age) {
      lo = sorted[i];
      hi = sorted[i + 1];
      break;
    }
  }
  if (lo.age === hi.age) return lo.ratePerThousand;
  const t = (age - lo.age) / (hi.age - lo.age);
  return lo.ratePerThousand + t * (hi.ratePerThousand - lo.ratePerThousand);
}

export function calculatePremium(input: {
  planCode: string;
  age: number;
  term: number;
  sumAssured: number;
  rows: RateRow[];
  plans: Plan[];
}): {
  yearly: number;
  halfYearly: number;
  quarterly: number;
  monthly: number;
  totalPaid: number;
  bonus: number;
  maturity: number;
  commissionYear1: number;
  interpolated: boolean;
  missing: boolean;
} {
  const rate = lookupRate(input.rows, input.planCode, input.age, input.term);
  if (rate == null) {
    return {
      yearly: 0,
      halfYearly: 0,
      quarterly: 0,
      monthly: 0,
      totalPaid: 0,
      bonus: 0,
      maturity: 0,
      commissionYear1: 0,
      interpolated: false,
      missing: true,
    };
  }
  const exact = input.rows.some(
    (r) => r.planCode === input.planCode && r.term === input.term && r.age === input.age,
  );
  const units = input.sumAssured / 1000;
  const yearly = Math.round(rate * units);
  const plan = input.plans.find((p) => p.code === input.planCode);
  const participating = ["Endowment", "Money-Back", "Whole Life"].includes(plan?.category ?? "");
  const termCover = plan?.category === "Term";
  const bonus = participating ? Math.round(48 * units * input.term) : 0;
  const fab = participating ? Math.round(6 * units * input.term) : 0;
  const maturity = termCover
    ? 0
    : participating
      ? input.sumAssured + bonus + fab
      : Math.round(input.sumAssured * 1.15);
  const firstYearPct =
    plan?.category === "ULIP" ? 0.075 : plan?.category === "Term" ? 0.25 : 0.25;
  return {
    yearly,
    halfYearly: Math.round(yearly * MODAL.halfYearly),
    quarterly: Math.round(yearly * MODAL.quarterly),
    monthly: Math.round(yearly * MODAL.monthly),
    totalPaid: yearly * input.term,
    bonus,
    maturity,
    commissionYear1: Math.round(yearly * firstYearPct),
    interpolated: !exact,
    missing: false,
  };
}

export function solveSumAssuredFromBudget(input: {
  planCode: string;
  age: number;
  term: number;
  budget: number;
  rows: RateRow[];
  plans: Plan[];
}): number {
  if (input.budget <= 0) return 0;
  let lo = 100000;
  let hi = 20000000;
  let best = lo;
  for (let i = 0; i < 24; i++) {
    const mid = Math.round((lo + hi) / 2 / 1000) * 1000;
    const y = calculatePremium({ ...input, sumAssured: mid }).yearly;
    if (y <= input.budget) {
      best = mid;
      lo = mid + 1000;
    } else {
      hi = mid - 1000;
    }
  }
  return best;
}
