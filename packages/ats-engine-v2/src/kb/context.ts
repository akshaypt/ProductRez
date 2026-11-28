import type { PmTrack } from '../types.ts'

/**
 * What kind of product someone works on, read from the words in their roles. This is deliberately separate from the track "readiness"
 * score, which says how well a resume is written for a track and so favours the generic track for everybody.
 * Each entry is a distinct idea; a role that mentions an idea several times counts it a few times, not endlessly.
 */
export const DOMAIN_TERMS: Record<Exclude<PmTrack, 'generalist'>, { label: string; short: string; weight: number; terms: [string, RegExp][] }> = {
  fintech: {
    label: 'fintech and payments',
    short: 'fintech',
    weight: 1.15,
    terms: [
      ['payments', /\bpayments?\b|\bpayouts?\b|\bremittances?\b/i],
      ['lending', /\blend(ing|er)\b|\bloans?\b|\bcredit\b|\bdisbursals?\b|\bnbfc\b|\bunderwriting\b/i],
      ['KYC', /\bkyc\b|\baml\b|\bonboarding compliance\b/i],
      ['UPI', /\bupi\b|\bneft\b|\bimps\b|\bcard (issuing|issuer)\b/i],
      ['wallets', /\bwallets?\b|\bvirtual accounts?\b/i],
      ['banking', /\bbank(ing|s)?\b|\bneobank\b|\bfintech\b|\bledger\b/i],
      ['fraud & risk', /\bfraud\b|\brisk (scoring|engine|model)\b|\bchargebacks?\b/i],
      ['insurance', /\binsur(ance|tech)\b/i],
      ['wealth & trading', /\bwealth\b|\bmutual funds?\b|\btrading\b|\bbrokerage\b|\binvesting\b|\bxirr\b/i],
      ['regulation', /\brbi\b|\bregulatory\b|\bcompliance\b/i],
    ],
  },
  growth_plg: {
    label: 'growth and product-led growth',
    short: 'growth',
    weight: 1,
    terms: [
      ['growth', /\bgrowth\b/i],
      ['PLG', /\bplg\b|\bproduct[- ]led\b/i],
      ['activation', /\bactivation\b|\bonboarding (flow|funnel|experience)\b/i],
      ['referrals', /\breferrals?\b|\bviral(ity)?\b/i],
      ['reactivation', /\breactivat\w*\b|\bre-?engagement\b|\bwin-?back\b|\blifecycle\b/i],
      ['monetization', /\bpaywall\b|\bsubscriptions?\b|\bmonetiz\w*\b|\bpricing\b/i],
      ['experiments', /\ba\/b\b|\bexperiments?\b|\bexperimentation\b/i],
      ['funnels', /\bfunnels?\b|\bconversion rate\b|\bsignup\b/i],
      ['acquisition', /\bacquisition\b|\bcac\b|\bltv\b|\bpush notifications?\b/i],
    ],
  },
  ai_ml: {
    label: 'AI and machine learning',
    short: 'AI/ML',
    weight: 1.25,
    terms: [
      ['LLMs', /\bllms?\b|\bgpt\b|\bgenerative\b|\bgen ?ai\b|\bopenai\b|\bclaude\b/i],
      ['RAG', /\brag\b|\bretrieval\b|\bembeddings?\b|\bvector\b/i],
      ['prompting', /\bprompts?\b|\bprompt engineering\b|\bcontext engineering\b/i],
      ['ML models', /\bmachine learning\b|\bml models?\b|\bml\b|\bdeep learning\b/i],
      ['NLP & vision', /\bnlp\b|\bcomputer vision\b|\bspeech\b/i],
      ['recommendations', /\brecommendation (engine|system|model)s?\b|\bpersonali[sz]ation model\b/i],
      ['agents', /\bagent(ic|s)?\b|\bcopilot\b|\bassistant\b/i],
      ['evals', /\bevals?\b|\bgolden (set|dataset)\b|\bhallucination\b|\bmodel accuracy\b/i],
      ['inference', /\binference\b|\bfine[- ]tun\w*\b|\btoken (cost|usage)\b/i],
      ['AI', /\bai\b|\bartificial intelligence\b/i],
    ],
  },
  b2b_saas: {
    label: 'B2B and enterprise SaaS',
    short: 'B2B SaaS',
    weight: 0.85,
    terms: [
      ['B2B', /\bb2b\b|\bb2b2c\b/i],
      ['SaaS', /\bsaas\b/i],
      ['enterprise customers', /\benterprise (customers?|clients?|accounts?|sales|platform|saas)\b/i],
      ['multi-tenant', /\bmulti[- ]?tenan\w*\b|\btenants?\b/i],
      ['access control', /\bsso\b|\bsaml\b|\brbac\b|\brole[- ]based access\b/i],
      ['CRM & ERP', /\bcrm\b|\berp\b|\bsalesforce\b|\bhubspot\b/i],
      ['integrations', /\bintegrations?\b|\bconnectors?\b|\bmarketplace apps?\b/i],
      ['contracts', /\bcontracts?\b|\bprocurement\b|\bsla\b|\bacv\b|\barr\b|\bmrr\b/i],
      ['workflows', /\bworkflow (engine|automation)s?\b|\badmin (console|portal|dashboard)\b/i],
    ],
  },
  platform_api: {
    label: 'platform and APIs',
    short: 'platform and APIs',
    weight: 1.15,
    terms: [
      ['APIs', /\bapis?\b|\bendpoints?\b|\brest(ful)?\b|\bgraphql\b/i],
      ['SDKs', /\bsdks?\b|\bdeveloper (experience|portal|docs|tools|platform)\b|\bdx\b/i],
      ['platform', /\bplatform (team|product|engineering)\b|\binternal platform\b|\bpaas\b/i],
      ['infrastructure', /\binfrastructure\b|\bmicroservices?\b|\bkubernetes\b|\bdevops\b|\bobservability\b/i],
      ['webhooks', /\bwebhooks?\b|\brate[- ]limit\w*\b|\bthroughput\b|\buptime\b/i],
      ['data platform', /\bdata (platform|pipeline|infrastructure|lake|warehouse)s?\b|\betl\b/i],
    ],
  },
}

/** A role title that names the focus is a strong signal on its own. */
export const TITLE_TRACK: [PmTrack, RegExp][] = [
  ['fintech', /\b(payments?|fintech|lending|banking|credit|wealth)\b/i],
  ['growth_plg', /\b(growth|plg|monetization|acquisition|retention)\b/i],
  ['ai_ml', /\b(ai|ml|machine learning|llm|genai|data science)\b/i],
  ['b2b_saas', /\b(b2b|enterprise|saas)\b/i],
  ['platform_api', /\b(platform|api|developer|infrastructure|infra|devex)\b/i],
]

/** Well-known employers, by the kind of company they are. Matched against the company name on the resume. */
export const BIG_TECH = /\b(google|alphabet|youtube|amazon|aws|microsoft|linkedin|github|meta|facebook|instagram|whatsapp|apple|netflix|nvidia|openai|anthropic|tesla|uber|airbnb|adobe|spotify|bytedance|tiktok|snap|twitter|x corp)\b/i
export const ENTERPRISE_CO = /\b(oracle|sap|ibm|cisco|vmware|dell|hewlett|hp|intel|qualcomm|accenture|deloitte|pwc|kpmg|ey|ernst|mckinsey|bcg|bain|capgemini|cognizant|infosys|tcs|tata consultancy|wipro|hcl|tech mahindra|mphasis|ltimindtree|jpmorgan|jp morgan|goldman|morgan stanley|citi|citibank|hsbc|barclays|american express|amex|mastercard|visa|wells fargo|bank of america|hdfc|icici|sbi|axis bank|kotak|siemens|bosch|honeywell|general electric|philips|servicenow|workday|salesforce|walmart|target|jio|airtel|vodafone|reliance|tata|mahindra|infosys bpm)\b/i
export const SCALEUP_CO = /\b(flipkart|swiggy|zomato|ola|paytm|phonepe|razorpay|cred|meesho|myntra|nykaa|groww|zerodha|upstox|dream11|unacademy|byju|lenskart|urban company|cars24|freshworks|zoho|postman|browserstack|chargebee|clevertap|druva|delhivery|shiprocket|slice|jupiter|zepto|blinkit|rapido|licious|pharmeasy|policybazaar|bigbasket|databricks|figma|notion|canva|airtable|gitlab|hashicorp|datadog|snowflake|twilio|shopify|doordash|instacart|robinhood|coinbase|plaid|brex|ramp|rippling|deel|stripe|atlassian)\b/i

/** Words that name an early funding stage. "0 to 1" and "MVP" are not here: large companies use them too, so they count for much less. */
export const STAGE_EARLY = /\b(pre-?seed|seed[- ](stage|funded|round)|angel|series a|stealth|early[- ]stage)\b/i
export const WEAK_EARLY = /\b(founding (team|pm|product)|first (pm|product manager|hire)|0[- ]?to[- ]?1|mvp)\b/i
export const STAGE_SCALE = /\b(series [b-f]|pre-?ipo|unicorn|hyper-?growth|scale-?up|growth[- ]stage|late[- ]stage|\$?\d+\s?(m|mn|million|b|bn|billion) (arr|revenue|valuation))\b/i
export const STAGE_ENTERPRISE = /\b(fortune ?(500|100)|global 2000|mnc|multinational|large enterprise|legacy|it services|big ?4|consultancy)\b/i
