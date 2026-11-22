export interface TutorLessonDoc {
  name: string
  size: string
  path?: string
  url: string
}

export interface TutorLessonItem {
  id: string
  index?: number | null
  title?: string | null
  description?: string | null
  status?: string | null
  video?: boolean | null
  video_url?: string | null
  video_path?: string | null
  tutor_draw_count?: number | null
  tutor_time_limit_minutes?: number | null
  tutor_max_attempts?: number | null
  documents?: TutorLessonDoc[] | null
  ai_documents?: TutorLessonDoc[] | null
}

/** Writes the lesson row; resolves true on success. */
export type SaveTutorLesson = (fields: Partial<TutorLessonItem>) => Promise<boolean> | boolean
