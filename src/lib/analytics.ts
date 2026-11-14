import { dateKeyFromToday, parseDay, toDateKey } from './dates'

export type RangeDays = 7 | 30 | 90

type SessionLike = {
  session_date: string
  duration_minutes: number | null
  completed: boolean
  subject_id: string | null
}

type MarkLike = {
  subject_id: string
  marks_obtained: number
  max_marks: number
  assessment_date: string | null
  assessment_name: string
  created_at: string
  id: string
}

type SubjectLike = { id: string; name: string }

type AssignmentLike = {
  completed: boolean
  due_date: string | null
}

type ExamLike = {
  title: string
  exam_date: string
}

export type Bucket = { key: string; label: string; minutes: number }

const MS_PER_DAY = 24 * 60 * 60 * 1000

function minutesByDay(sessions: SessionLike[]): Map<string, number> {
  const map = new Map<string, number>()

  for (const session of sessions) {
    if (!session.completed) continue

    const day = toDateKey(session.session_date)

    map.set(day, (map.get(day) ?? 0) + (session.duration_minutes ?? 0))
  }

  return map
}

function sumBetween(
  byDay: Map<string, number>,
  startOffset: number,
  endOffset: number
): number {
  let total = 0

  // offsets are days from today (0 = today, -1 = yesterday ...)
  for (let offset = startOffset; offset <= endOffset; offset += 1) {
    total += byDay.get(dateKeyFromToday(offset)) ?? 0
  }

  return total
}

// 7 and 30 days show one bar per day; 90 days shows one bar per week.
export function buildStudyBuckets(sessions: SessionLike[], range: RangeDays) {
  const byDay = minutesByDay(sessions)
  const buckets: Bucket[] = []

  if (range === 90) {
    for (let week = 12; week >= 0; week -= 1) {
      const start = -(week * 7 + 6)
      const end = -(week * 7)
      const startKey = dateKeyFromToday(start)

      buckets.push({
        key: startKey,
        label: parseDay(startKey).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        minutes: sumBetween(byDay, start, end),
      })
    }
  } else {
    for (let offset = -(range - 1); offset <= 0; offset += 1) {
      const key = dateKeyFromToday(offset)

      buckets.push({
        key,
        label: parseDay(key).toLocaleDateString(
          undefined,
          range === 7 ? { weekday: 'short' } : { day: 'numeric' }
        ),
        minutes: byDay.get(key) ?? 0,
      })
    }
  }

  const total = buckets.reduce((sum, bucket) => sum + bucket.minutes, 0)

  // the equally long stretch just before this one, for comparison
  const previousTotal = sumBetween(byDay, -(2 * range - 1), -range)

  return { buckets, total, previousTotal }
}

// A streak is a run of consecutive days with at least one completed session.
// It stays alive through today, so it only breaks once a whole day is missed.
export function computeStreaks(sessions: SessionLike[]) {
  const days = new Set(
    sessions
      .filter((session) => session.completed)
      .map((session) => toDateKey(session.session_date))
  )

  let current = 0
  let start = days.has(dateKeyFromToday(0))
    ? 0
    : days.has(dateKeyFromToday(-1))
      ? -1
      : null

  if (start !== null) {
    while (days.has(dateKeyFromToday(start))) {
      current += 1
      start -= 1
    }
  }

  const sorted = [...days].sort()
  let best = 0
  let run = 0

  for (let index = 0; index < sorted.length; index += 1) {
    const gap =
      index === 0
        ? null
        : Math.round(
            (parseDay(sorted[index]).getTime() -
              parseDay(sorted[index - 1]).getTime()) /
              MS_PER_DAY
          )

    run = gap === 1 ? run + 1 : 1
    best = Math.max(best, run)
  }

  return { current, best }
}

export function studyBySubject(
  sessions: SessionLike[],
  subjects: SubjectLike[],
  range: RangeDays
) {
  const names = new Map(subjects.map((subject) => [subject.id, subject.name]))
  const first = dateKeyFromToday(-(range - 1))
  const last = dateKeyFromToday(0)
  const totals = new Map<string, number>()

  for (const session of sessions) {
    const day = toDateKey(session.session_date)

    if (!session.completed || day < first || day > last) continue

    const key = session.subject_id && names.has(session.subject_id)
      ? session.subject_id
      : ''

    totals.set(key, (totals.get(key) ?? 0) + (session.duration_minutes ?? 0))
  }

  return [...totals.entries()]
    .map(([id, minutes]) => ({
      id,
      name: id ? (names.get(id) ?? 'Subject') : 'No subject',
      minutes,
    }))
    .filter((row) => row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
}

export function scoreSubjects(subjects: SubjectLike[], marks: MarkLike[]) {
  return subjects
    .map((subject) => {
      const own = marks.filter((mark) => mark.subject_id === subject.id)
      const valid = own.filter(
        (mark) => mark.max_marks > 0 && mark.marks_obtained >= 0
      )
      const obtained = valid.reduce((sum, mark) => sum + mark.marks_obtained, 0)
      const maximum = valid.reduce((sum, mark) => sum + mark.max_marks, 0)

      return {
        subject,
        markCount: own.length,
        obtained,
        maximum,
        percentage: maximum > 0 ? (obtained / maximum) * 100 : null,
      }
    })
    .sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1))
}

export function buildMarkTrend(marks: MarkLike[], subjectId: string) {
  return marks
    .filter(
      (mark) =>
        mark.max_marks > 0 &&
        mark.marks_obtained >= 0 &&
        (subjectId === '' || mark.subject_id === subjectId)
    )
    .map((mark) => ({
      id: mark.id,
      name: mark.assessment_name,
      day: toDateKey(mark.assessment_date ?? mark.created_at),
      percent: (mark.marks_obtained / mark.max_marks) * 100,
    }))
    .sort((a, b) => a.day.localeCompare(b.day))
}

export function summarizeWork(
  assignments: AssignmentLike[],
  exams: ExamLike[]
) {
  const today = dateKeyFromToday(0)
  const inTwoWeeks = dateKeyFromToday(14)

  const completed = assignments.filter((item) => item.completed).length
  const pending = assignments.length - completed
  const overdue = assignments.filter(
    (item) =>
      !item.completed && item.due_date && toDateKey(item.due_date) < today
  ).length

  const upcoming = exams
    .filter((exam) => toDateKey(exam.exam_date) >= today)
    .sort((a, b) =>
      toDateKey(a.exam_date).localeCompare(toDateKey(b.exam_date))
    )

  return {
    total: assignments.length,
    completed,
    pending,
    overdue,
    completionRate:
      assignments.length > 0
        ? Math.round((completed / assignments.length) * 100)
        : null,
    nextExam: upcoming[0] ?? null,
    examsInTwoWeeks: upcoming.filter(
      (exam) => toDateKey(exam.exam_date) <= inTwoWeeks
    ).length,
  }
}
