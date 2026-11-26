import type { CompanyArchetype, Level, MarketRegion, PmTrack } from '../types.ts'

export interface CompBandDef {
  min: number
  p25: number
  median: number
  p75: number
  max: number
}

export interface MarketCompMeta {
  currency: 'INR' | 'USD'
  unitLabel: string
  baseVsTotalNote: string
}

export const MARKET_COMP_META: Record<MarketRegion, MarketCompMeta> = {
  india: {
    currency: 'INR',
    unitLabel: '₹ LPA (Total CTC)',
    baseVsTotalNote:
      'Figures reflect Total Annual CTC in ₹ Lakhs (LPA). At Scale-ups and MAANG, 15–35% of total comp is typically ESOPs/RSUs.',
  },
  us: {
    currency: 'USD',
    unitLabel: '$k USD (Total Comp)',
    baseVsTotalNote:
      'Figures reflect Annual Total Compensation ($k USD: base + bonus + annual equity vest). Base salary is typically 65–80% at Scale-ups/MAANG.',
  },
  remote_global: {
    currency: 'USD',
    unitLabel: '$k USD (Remote Comp)',
    baseVsTotalNote:
      'Figures reflect Annual Total Compensation ($k USD) for distributed/location-adjusted global remote PM roles.',
  },
}

function band(min: number, median: number, max: number): CompBandDef {
  return {
    min,
    p25: Math.round(min + (median - min) * 0.55),
    median,
    p75: Math.round(median + (max - median) * 0.52),
    max,
  }
}

/**
 * 2026 PM Compensation Benchmark Matrix: Market x Company Archetype x Level.
 * Values are in INR LPA (india) or USD $k (us, remote_global).
 */
export const COMP_BENCHMARKS: Record<MarketRegion, Record<CompanyArchetype, Record<Level, CompBandDef>>> = {
  india: {
    early_startup: {
      apm: band(10, 13, 16),
      pm: band(16, 21, 26),
      senior: band(26, 34, 42),
      lead: band(40, 52, 64),
    },
    scaleup: {
      apm: band(13, 16, 20),
      pm: band(20, 26, 34),
      senior: band(32, 42, 54),
      lead: band(52, 66, 85),
    },
    maang: {
      apm: band(18, 22, 26),
      pm: band(28, 36, 46),
      senior: band(48, 62, 82),
      lead: band(78, 98, 125),
    },
    enterprise: {
      apm: band(10, 13, 16),
      pm: band(16, 22, 28),
      senior: band(26, 33, 42),
      lead: band(40, 50, 62),
    },
  },
  us: {
    early_startup: {
      apm: band(105, 128, 155),
      pm: band(145, 175, 210),
      senior: band(185, 225, 275),
      lead: band(240, 295, 360),
    },
    scaleup: {
      apm: band(125, 150, 180),
      pm: band(170, 215, 260),
      senior: band(225, 275, 345),
      lead: band(300, 375, 470),
    },
    maang: {
      apm: band(155, 185, 220),
      pm: band(220, 275, 340),
      senior: band(300, 395, 520),
      lead: band(440, 575, 750),
    },
    enterprise: {
      apm: band(105, 125, 145),
      pm: band(140, 170, 205),
      senior: band(180, 215, 260),
      lead: band(230, 280, 340),
    },
  },
  remote_global: {
    early_startup: {
      apm: band(75, 92, 115),
      pm: band(105, 132, 165),
      senior: band(140, 175, 220),
      lead: band(185, 230, 285),
    },
    scaleup: {
      apm: band(90, 112, 138),
      pm: band(125, 158, 195),
      senior: band(170, 215, 265),
      lead: band(225, 280, 350),
    },
    maang: {
      apm: band(115, 140, 170),
      pm: band(160, 200, 245),
      senior: band(225, 280, 350),
      lead: band(300, 380, 470),
    },
    enterprise: {
      apm: band(75, 95, 115),
      pm: band(105, 130, 160),
      senior: band(140, 172, 210),
      lead: band(185, 225, 275),
    },
  },
}

export const TRACK_COMP_PREMIUM: Record<PmTrack, { premiumPercent: number; note: string }> = {
  generalist: {
    premiumPercent: 0,
    note: 'Baseline generalist PM compensation band.',
  },
  ai_ml: {
    premiumPercent: 15,
    note: '+15% 2026 market premium for AI/ML PMs with proven evals, context engineering/RAG, and inference unit economics.',
  },
  fintech: {
    premiumPercent: 6,
    note: '+6% domain premium for regulated Fintech/Payments PMs owning risk, compliance, and TPV/take-rate.',
  },
  platform_api: {
    premiumPercent: 6,
    note: '+6% technical premium for Platform/API PMs managing developer ecosystems, SLAs, and internal leverage.',
  },
  growth_plg: {
    premiumPercent: 5,
    note: '+5% commercial premium for Growth/PLG PMs directly driving self-serve activation and ARR expansion.',
  },
  b2b_saas: {
    premiumPercent: 3,
    note: '+3% enterprise SaaS premium for B2B PMs owning NRR, expansion, and multi-stakeholder adoption.',
  },
}

export const COMP_METHODOLOGY_NOTE =
  '2026 ProductRez Benchmark Estimate calibrated by market, company stage, PM level, track premium, and resume impact strength. Actual offers vary by city, negotiation, and equity liquidity.'
