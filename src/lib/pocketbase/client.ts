import PocketBase, { LocalAuthStore } from 'pocketbase'

const POCKETBASE_FALLBACK_URL =
  'https://sistema-de-receitas-culinarias-ea104.shrd00.internal.goskip.dev'

const pocketbaseUrl =
  (import.meta.env.VITE_POCKETBASE_URL as string | undefined)?.trim() || POCKETBASE_FALLBACK_URL

export const pb = new PocketBase(pocketbaseUrl, new LocalAuthStore('pb_auth'))

// Desativa auto-cancelamento para evitar abortar requisições legítimas concorrentes
pb.autoCancellation(false)

export default pb
