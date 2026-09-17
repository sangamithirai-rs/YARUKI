# YARUKI Backend

## Backend Stack

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- TypeScript
- @supabase/supabase-js

---

## Database Tables

### profiles

| Column | Type |
|---|---|
| id | uuid |
| full_name | text |
| avatar_url | text |
| created_at | timestamptz |

### subjects

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| name | text |
| code | text |
| credits | numeric |
| created_at | timestamptz |

### marks

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| subject_id | uuid |
| assessment_name | text |
| marks_obtained | numeric |
| max_marks | numeric |
| assessment_date | date |
| created_at | timestamptz |

### exams

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| subject_id | uuid |
| title | text |
| exam_date | timestamptz |
| syllabus | text |
| created_at | timestamptz |

### assignments

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| subject_id | uuid |
| title | text |
| description | text |
| due_date | timestamptz |
| completed | boolean |
| created_at | timestamptz |

### study_sessions

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| subject_id | uuid |
| topic | text |
| duration_minutes | integer |
| session_date | date |
| completed | boolean |
| created_at | timestamptz |

### study_materials

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| subject_id | uuid |
| title | text |
| file_name | text |
| file_path | text |
| file_type | text |
| created_at | timestamptz |

### study_plans

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| title | text |
| plan_date | date |
| description | text |
| ai_generated | boolean |
| created_at | timestamptz |

---

# Services

All backend services are located in:

`src/services/`

## Authentication

File:

`authService.ts`

Functions:

```ts
signUp(email, password, fullName)
signIn(email, password)
signOut()
getCurrentUser()
```

### Subjects

File:

`subjectService.ts`

Functions:

```ts
getSubjects()
addSubject(name, code, credits)
updateSubject(id, updates)
deleteSubject(id)
```

### Marks

File:

`markService.ts`

Functions:

```ts
getMarks(subjectId)
addMark(subjectId, assessmentName, marksObtained, maxMarks, assessmentDate)
updateMark(id, updates)
deleteMark(id)
```

### Exams

File:

`examService.ts`

Functions:

```ts
getExams()
addExam(title, examDate, subjectId, syllabus)
updateExam(id, updates)
deleteExam(id)
```

### Assignments

File:

`assignmentService.ts`

Functions:

```ts
getAssignments()
addAssignment(title, description, dueDate, subjectId)
updateAssignment(id, updates)
deleteAssignment(id)
```

### Study Sessions

File:

`studySessionService.ts`

Functions:

```ts
getStudySessions()
addStudySession(sessionDate, topic, durationMinutes, subjectId)
updateStudySession(id, updates)
deleteStudySession(id)
```

### Study Plans

File:

`studyPlanService.ts`

Functions:

```ts
getStudyPlans()
addStudyPlan(title, planDate, description, aiGenerated)
updateStudyPlan(id, updates)
deleteStudyPlan(id)
```

### Study Materials

File:

`materialService.ts`

Functions:

```ts
getMaterials()
uploadMaterial(file, title, subjectId)
getMaterialUrl(filePath)
deleteMaterial(id, filePath)
```

---

## Security

All user-owned tables use Row Level Security (RLS).

The general rule is:

```text
auth.uid() === user_id
```

Users should only be able to access their own academic data.

The `study-materials` Storage bucket is private.

Files are accessed through temporary signed URLs.

---

## Frontend Usage

Import the required service:

```ts
import { getSubjects, addSubject } from './services/subjectService'
```

Example:

```ts
const subjects = await getSubjects()
```

Example:

```ts
const subject = await addSubject(
  'Mathematics',
  'MAT101',
  4
)
```

---

## Important

Never commit:

```text
.env
.env.local
```

Never expose:

```text
service_role key
database password
secret API keys
```

Only public/publishable Supabase credentials should be used in the browser.
