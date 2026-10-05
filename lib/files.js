// Client-safe: turn a stored file reference (R2 key or legacy URL) into a link that the
// server authorises and redirects to a short-lived signed URL. Blob/data previews pass through.
export function fileHref(ref) {
  if (!ref || /^(blob|data):/.test(ref)) return ref;
  return `/api/files?ref=${encodeURIComponent(ref)}`;
}

// Every public.lessons column EXCEPT ai_documents. Student pages must select this, never "*",
// so AI-only documents never reach the student browser. Add new lessons columns here.
export const STUDENT_LESSON_COLUMNS =
  "id, course_id, index, title, duration, description, video, pretest, posttest, assignment, status, progress, watch_limit, allow_download, documents, video_url, video_path, allow_ai, has_docs, has_pretest, has_posttest, has_assignment";
