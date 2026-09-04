import pb from '@/lib/pocketbase/client'
import { UserSettings } from '@/types'

/**
 * Busca as configurações do usuário atualmente autenticado.
 * Retorna null se ainda não houver registro criado.
 */
export async function getUserSettings(): Promise<UserSettings | null> {
  const currentUserId = pb.authStore.model?.id
  if (!currentUserId) return null

  try {
    return await pb
      .collection('user_settings')
      .getFirstListItem<UserSettings>(`user = "${currentUserId}"`, {
        requestKey: null,
      })
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status
    if (status === 404) return null
    return null
  }
}

/**
 * Salva ou atualiza as configurações do usuário (limite de custo por porção).
 */
export async function saveUserSettings(data: {
  cost_limit_per_portion: number | null
}): Promise<UserSettings> {
  const currentUserId = pb.authStore.model?.id
  if (!currentUserId) {
    throw new Error('Usuário não autenticado.')
  }

  const existing = await getUserSettings()

  const payload = {
    user: currentUserId,
    cost_limit_per_portion:
      data.cost_limit_per_portion !== null && data.cost_limit_per_portion !== undefined
        ? Number(data.cost_limit_per_portion)
        : null,
  }

  if (existing) {
    return await pb.collection('user_settings').update<UserSettings>(existing.id, payload)
  }

  return await pb.collection('user_settings').create<UserSettings>(payload)
}
