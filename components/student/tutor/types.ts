export interface TutorSetSummary {
  id: string
  code: string | null
  title: string | null
  subtitle: string | null
  hero: string | null
  lessons: number
}

export interface TutorSetDetail {
  id: string
  code: string | null
  title: string | null
  subtitle: string | null
  instructor: string | null
}

export interface TutorLessonItem {
  id: string
  index: number | null
  title: string
  duration: string | null
  description: string | null
  tutor_max_attempts: number | null
  hasVideo: boolean
}

export interface TutorSetResponse {
  set: TutorSetDetail
  lessons: TutorLessonItem[]
}

export interface TutorLessonData {
  id: string
  index: number | null
  title: string
  duration: string | null
  description: string | null
  video_url: string | null
  attemptLimit: number | null
  canStart: boolean
  timeLimit: number | null
}

export interface TutorLessonResponse {
  set: { id: string; code: string | null }
  lesson: TutorLessonData
}
