import { supabase } from "@/lib/supabase"

/** Deletes submissions, assignments and rubrics of the given assignments (children first). Throws on the first DB error. */
export async function deleteAssignmentTree(assignments: { id: string; rubric_id: string | null }[] | null) {
  const assignmentIds = assignments?.map((a) => a.id) || []
  const rubricIds = assignments?.map((a) => a.rubric_id).filter((id): id is string => Boolean(id)) || []

  if (assignmentIds.length > 0) {
    const { error: subErr } = await supabase.from("submissions").delete().in("assignment_id", assignmentIds)
    if (subErr) throw subErr
    const { error: asgErr } = await supabase.from("assignments").delete().in("id", assignmentIds)
    if (asgErr) throw asgErr
  }
  if (rubricIds.length > 0) {
    const { error: rubErr } = await supabase.from("rubrics").delete().in("id", rubricIds)
    if (rubErr) throw rubErr
  }
}

/** Removes a lesson with its assignments, submissions, rubrics and questions. */
export async function deleteLessonCascade(lessonId: string) {
  const { data } = await supabase.from("assignments").select("id, rubric_id").eq("lesson_id", lessonId)
  await deleteAssignmentTree(data)
  const { error: qErr } = await supabase.from("questions").delete().eq("lesson_id", lessonId)
  if (qErr) throw qErr
  const { error: lesErr } = await supabase.from("lessons").delete().eq("id", lessonId)
  if (lesErr) throw lesErr
}

/** Removes a course with all its lessons, assignments, submissions, rubrics and questions. */
export async function deleteCourseCascade(courseId: string) {
  const { data } = await supabase.from("assignments").select("id, rubric_id").eq("course_id", courseId)
  const { data: lessons } = await supabase.from("lessons").select("id").eq("course_id", courseId)
  const lessonIds = lessons?.map((l) => l.id) || []

  await deleteAssignmentTree(data)
  if (lessonIds.length > 0) {
    const { error: qErr } = await supabase.from("questions").delete().in("lesson_id", lessonIds)
    if (qErr) throw qErr
    const { error: lesErr } = await supabase.from("lessons").delete().in("id", lessonIds)
    if (lesErr) throw lesErr
  }
  const { error: cErr } = await supabase.from("courses_all").delete().eq("id", courseId)
  if (cErr) throw cErr
}
