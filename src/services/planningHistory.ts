import pb from '@/lib/pocketbase/client'
import type { Recipe } from '@/types'
import type { MealType } from '@/services/mealPlans'

/**
 * Shape of the JSON snapshot stored in `planning_history.plan_data`.
 * Self-contained: the recipes are embedded so archived weeks remain
 * viewable even if the underlying records are later changed or deleted.
 */
export interface HistoryPlanEntry {
  date: string // YYYY-MM-DD
  meal_type: MealType
  recipe: Recipe | null
}

export interface HistoryPlanData {
  week_start: string
  week_end: string
  plans: HistoryPlanEntry[]
  notes: Record<string, string>
}

export interface PlanningHistoryRecord {
  id: string
  user: string
  week_start: string
  week_end: string
  plan_data: HistoryPlanData
  created: string
  updated: string
}

/** Lists all archived weeks for the current user, newest first. */
export async function listPlanningHistory(): Promise<PlanningHistoryRecord[]> {
  const user = pb.authStore.record
  if (!user) return []
  return await pb.collection('planning_history').getFullList<PlanningHistoryRecord>({
    filter: `user = "${user.id}"`,
    sort: '-week_start',
    requestKey: null,
  })
}

/** Fetches a single archived week by id. */
export async function getPlanningHistory(id: string): Promise<PlanningHistoryRecord> {
  return await pb.collection('planning_history').getOne<PlanningHistoryRecord>(id, {
    requestKey: null,
  })
}

/**
 * Upserts a week snapshot. If a record already exists for the same user +
 * week_start, it is updated (in place); otherwise a new record is created.
 */
export async function savePlanningHistory(
  weekStart: string,
  weekEnd: string,
  planData: HistoryPlanData,
): Promise<PlanningHistoryRecord> {
  const user = pb.authStore.record
  if (!user) throw new Error('Usuário não autenticado')

  let existingId: string | null = null
  try {
    const existing = await pb
      .collection('planning_history')
      .getFirstListItem<PlanningHistoryRecord>(
        `user = "${user.id}" && week_start = "${weekStart}"`,
        { requestKey: null },
      )
    existingId = existing.id
  } catch (err: unknown) {
    const code = (err as { status?: number })?.status
    if (code !== 404) throw err
  }

  if (existingId) {
    return await pb.collection('planning_history').update<PlanningHistoryRecord>(existingId, {
      week_end: weekEnd,
      plan_data: planData,
    })
  }

  return await pb.collection('planning_history').create<PlanningHistoryRecord>({
    user: user.id,
    week_start: weekStart,
    week_end: weekEnd,
    plan_data: planData,
  })
}

/** Removes an archived week. */
export async function deletePlanningHistory(id: string): Promise<void> {
  await pb.collection('planning_history').delete(id)
}
