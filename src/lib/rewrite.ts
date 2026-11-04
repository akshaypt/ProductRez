import { isWeakOpening } from '@scoring'

const WEAK_TO_STRONG: [RegExp, string][] = [
  [/^\s*(was\s+)?responsible\s+for\s+(managing|owning|leading)?\s*/i, 'Owned '],
  [/^\s*(helped|assisted|supported)\s+(with\s+|in\s+)?(the\s+)?/i, 'Drove '],
  [/^\s*(worked|working)\s+(on|with)\s+/i, 'Shipped '],
  [/^\s*(was\s+)?(involved|participated)\s+in\s+/i, 'Led '],
  [/^\s*(participated|contributed)\s+(in|to)\s+/i, 'Drove '],
  [/^\s*handled\s+/i, 'Owned '],
]

const lcFirst = (s: string) => (/^[A-Z]{2}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1))
const clean = (s: string) => s.replace(/\s+/g, ' ').replace(/[.;]+$/, '').trim()

/**
 * Offline fallback when no AI is configured. These are scaffolds, never invented facts:
 * everything unknown stays as a [placeholder] for the user to fill with the real number.
 */
export function localRewrite(bullet: string, _role = '', _level = ''): string[] {
  let text = clean(bullet)
  if (isWeakOpening(text)) {
    for (const [re, verb] of WEAK_TO_STRONG) {
      if (re.test(text)) {
        text = verb + text.replace(re, '')
        break
      }
    }
  }
  const body = clean(text.replace(/^[A-Z][a-z]+\s+/, ''))
  const verb = text.match(/^[A-Z][a-z]+/)?.[0] ?? 'Led'
  return [
    `${verb} ${lcFirst(body)}, lifting [metric] from [baseline] to [result] in [timeframe]`,
    `Increased [metric] by [X%] by ${lcFirst(verb === 'Owned' ? 'owning' : verb.replace(/ed$/, 'ing'))} ${lcFirst(body)} for [N users / segment]`,
    `${verb} ${lcFirst(body)} with [teams], aligning [stakeholders] and delivering [outcome] by [date]`,
  ]
}
