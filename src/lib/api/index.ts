import type { Api } from '../types'
import { createSupabaseApi } from './supabase'

let instance: Api | null = null
let pending: Promise<Api> | null = null

/**
 * Backend selection happens at build time. When Supabase env vars are present the demo adapter
 * (and the bundled sample data) is dead-code-eliminated, so paid content never ships in the client.
 */
export function getApi(): Promise<Api> {
  if (instance) return Promise.resolve(instance)
  pending ??= (async () => {
    if (!__DEMO__) {
      instance = createSupabaseApi()
    } else {
      const { createLocalApi } = await import('./local')
      instance = createLocalApi()
    }
    return instance
  })()
  return pending
}
