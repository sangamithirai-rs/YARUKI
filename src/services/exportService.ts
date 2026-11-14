import { getSubjects } from './subjectService'
import { getAllMarks } from './markService'
import { getExams } from './examService'
import { getAssignments } from './assignmentService'
import { getStudySessions } from './SessionService'
import { getStudyPlans } from './studyPlanService'
import { getMaterials, getFolders } from './materialService'

// Everything stored for the signed-in user, ready to save as a JSON file.
// Uploaded files themselves are not included, only their details.
export async function collectUserData() {
  const results = await Promise.allSettled([
    getSubjects(),
    getAllMarks(),
    getExams(),
    getAssignments(),
    getStudySessions(),
    getStudyPlans(),
    getMaterials(),
    getFolders(),
  ])

  const names = [
    'subjects',
    'marks',
    'exams',
    'assignments',
    'studySessions',
    'studyPlans',
    'materials',
    'materialFolders',
  ] as const

  const data: Record<string, unknown[]> = {}
  const unavailable: string[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      data[names[index]] = result.value
    } else {
      unavailable.push(names[index])
    }
  })

  // The folders table only exists once the optional folders update has been
  // run, so a missing one is normal and not worth mentioning.
  const missing = unavailable.filter((name) => name !== 'materialFolders')

  if (missing.length > 0) {
    throw new Error(`Could not read your ${missing.join(', ')}. Nothing was exported.`)
  }

  const count = Object.values(data).reduce(
    (total, rows) => total + rows.length,
    0
  )

  return {
    exportedAt: new Date().toISOString(),
    app: 'YARUKI',
    itemCount: count,
    data,
  }
}
