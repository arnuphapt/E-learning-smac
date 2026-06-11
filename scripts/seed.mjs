import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { DATA } from '../lib/data.js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Starting seed...");

  // Insert Users (Students)
  const users = DATA.students.map(s => ({
    id: s.id,
    name: s.name,
    student_no: s.no,
    section: s.sec,
    role: 'student'
  }));
  
  // Also add an instructor user manually for testing
  users.push({
    id: "inst1",
    name: "อ. ดร. สุภาวดี ทองคำ",
    role: "instructor",
  });
  users.push({
    id: "inst2",
    name: "อ. กมลชนก ศรีวิไล",
    role: "instructor",
  });

  const { error: uErr } = await supabase.from('users').upsert(users);
  if (uErr) console.error("Error inserting users", uErr);
  else console.log("Users seeded");

  // Academic Years
  const { error: ayErr } = await supabase.from('academic_years').upsert(DATA.academicYears.map(ay => ({
    id: ay.id,
    year: ay.year,
    label: ay.label,
    start_date: ay.start,
    end_date: ay.end,
    status: ay.status,
    courses: ay.courses
  })));
  if (ayErr) console.error("Error inserting academic_years", ayErr);

  // Terms
  const { error: tErr } = await supabase.from('terms').upsert(DATA.terms.map(t => ({
    id: t.id,
    name: t.name,
    year: t.year,
    start_date: t.start,
    end_date: t.end,
    status: t.status
  })));
  if (tErr) console.error("Error inserting terms", tErr);

  // Subject Groups
  const { error: sgErr } = await supabase.from('subject_groups').upsert(DATA.subjectGroups);
  if (sgErr) console.error("Error inserting subject_groups", sgErr);

  // Sections
  const { error: secErr } = await supabase.from('sections').upsert(DATA.sectionList.map(s => ({
    id: s.id,
    name: s.name,
    group_name: s.group,
    students: s.students,
    status: s.status
  })));
  if (secErr) console.error("Error inserting sections", secErr);

  // Courses
  const { error: cErr } = await supabase.from('courses').upsert(DATA.courses.map(c => ({
    id: c.id,
    code: c.code,
    title: c.title,
    subtitle: c.subtitle,
    term: c.term,
    year: c.year,
    instructor: c.instructor,
    lessons: c.lessons,
    students: c.students,
    progress: c.progress,
    hero: c.hero,
    access: c.access
  })));
  if (cErr) console.error("Error inserting courses", cErr);

  // Lessons
  const { error: lErr } = await supabase.from('lessons').upsert(DATA.lessons.map(l => ({
    id: l.id,
    course_id: l.courseId,
    index: l.index,
    title: l.title,
    duration: l.duration,
    description: l.desc,
    video: l.video,
    pretest: l.pretest,
    posttest: l.posttest,
    assignment: l.assignment,
    status: l.status,
    progress: l.progress
  })));
  if (lErr) console.error("Error inserting lessons", lErr);

  // Questions
  const { error: qErr } = await supabase.from('questions').upsert(DATA.questions);
  if (qErr) console.error("Error inserting questions", qErr);

  // Rubrics
  const { error: rErr } = await supabase.from('rubrics').upsert([{
    id: DATA.rubric.id,
    title: DATA.rubric.title,
    criteria: DATA.rubric.criteria
  }]);
  if (rErr) console.error("Error inserting rubrics", rErr);

  // Assignments
  const { error: aErr } = await supabase.from('assignments').upsert(DATA.assignments.map(a => ({
    id: a.id,
    lesson_id: a.lessonId,
    course_id: a.courseId,
    title: a.title,
    due: a.due,
    due_short: a.dueShort,
    points: a.points,
    instructions: a.instructions,
    attachments: a.attachments,
    rubric_id: a.rubricId,
    allow_text: a.allowText,
    allow_file: a.allowFile
  })));
  if (aErr) console.error("Error inserting assignments", aErr);

  // Submissions
  const { error: subErr } = await supabase.from('submissions').upsert(DATA.submissions.map(s => ({
    id: s.id,
    student_id: s.studentId,
    assignment_id: s.assignmentId,
    status: s.status,
    submitted_at: s.at,
    file: s.file,
    score: s.score,
    total: s.total,
    late: s.late
  })));
  if (subErr) console.error("Error inserting submissions", subErr);

  // Test Scores
  const { error: tsErr } = await supabase.from('test_scores').upsert(DATA.testScores.map(t => ({
    student_id: t.studentId,
    pre: t.pre,
    post: t.post,
    total: t.total
  })));
  if (tsErr) console.error("Error inserting test_scores", tsErr);

  console.log("Seed completed");
}

seed();
