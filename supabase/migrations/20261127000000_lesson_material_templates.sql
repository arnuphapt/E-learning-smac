-- Reusable pre/post-test and worksheet masters. Copies are independent lesson content.
-- Apply to DEV only via agy, per Dice. No existing content is backfilled or replaced.
BEGIN;

CREATE TABLE public.lesson_material_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('pre', 'post', 'assignment')),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lesson_material_templates_kind_title_idx ON public.lesson_material_templates(kind, title, id);
ALTER TABLE public.lesson_material_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lesson_material_templates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_material_templates TO authenticated;
GRANT ALL ON public.lesson_material_templates TO service_role;
CREATE POLICY lesson_material_templates_staff ON public.lesson_material_templates
  FOR ALL TO authenticated USING (public.is_instructor()) WITH CHECK (public.is_instructor());

-- SECURITY INVOKER preserves the existing staff RLS on lessons/questions/assignments/rubrics.
-- One transaction prevents a partial test or an assignment without its rubric.
CREATE FUNCTION public.copy_lesson_material(
  p_template uuid, p_lesson text, p_due text DEFAULT NULL, p_due_time text DEFAULT '23:59'
) RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  t public.lesson_material_templates%ROWTYPE;
  l public.lessons%ROWTYPE;
  q jsonb;
  c jsonb;
  w jsonb;
  criterion jsonb;
  total numeric := 0;
  n integer := 0;
  new_id text := gen_random_uuid()::text;
  rubric_id text := gen_random_uuid()::text;
BEGIN
  IF NOT coalesce(public.is_instructor(), false) THEN
    RAISE EXCEPTION 'เฉพาะผู้สอนเท่านั้นที่เลือกใช้ Master ได้' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO t FROM public.lesson_material_templates WHERE id = p_template;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบ Master นี้ กรุณาโหลดรายการใหม่'; END IF;
  SELECT * INTO l FROM public.lessons WHERE id = p_lesson FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบบทเรียน'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.courses_all WHERE id = l.course_id AND coalesce(kind, 'course') <> 'tutor') THEN
    RAISE EXCEPTION 'เลือกใช้ Master ได้เฉพาะบทเรียนในรายวิชา';
  END IF;
  IF p_due IS NOT NULL THEN
    IF p_due !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'วันที่ไม่ถูกต้อง'; END IF;
    PERFORM p_due::date;
  END IF;
  IF p_due_time IS NULL OR p_due_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    RAISE EXCEPTION 'เวลาไม่ถูกต้อง';
  END IF;

  IF t.kind IN ('pre', 'post') THEN
    IF (t.kind = 'pre' AND NOT coalesce(l.has_pretest, false)) OR
       (t.kind = 'post' AND NOT coalesce(l.has_posttest, false)) THEN
      RAISE EXCEPTION 'กรุณาเปิดใช้งานแบบทดสอบในบทเรียนก่อน';
    END IF;
    -- Never overwrite questions or student work. Locking the lesson serializes concurrent copies.
    IF EXISTS (SELECT 1 FROM public.questions WHERE lesson_id = p_lesson AND kind = t.kind) THEN
      RAISE EXCEPTION 'ส่วนนี้มีข้อสอบแล้ว เลือก Master ได้เฉพาะส่วนที่ยังไม่มีข้อสอบ';
    END IF;
    IF EXISTS (SELECT 1 FROM public.test_scores WHERE lesson_id = p_lesson AND
       ((t.kind = 'pre' AND pre IS NOT NULL) OR (t.kind = 'post' AND post IS NOT NULL))) THEN
      RAISE EXCEPTION 'ส่วนนี้มีผลสอบแล้ว ไม่สามารถเปลี่ยนชุดข้อสอบได้';
    END IF;
    IF jsonb_typeof(t.payload->'questions') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'คำถามใน Master ไม่ถูกต้อง'; END IF;
    IF jsonb_array_length(t.payload->'questions') = 0 THEN RAISE EXCEPTION 'Master ต้องมีคำถามอย่างน้อย 1 ข้อ'; END IF;
    c := t.payload->'config';
    IF jsonb_typeof(c) IS DISTINCT FROM 'object' OR
       jsonb_typeof(c->'passing_score') IS DISTINCT FROM 'number' OR
       (c->>'passing_score')::numeric NOT BETWEEN 0 AND 100 OR
       jsonb_typeof(c->'time_limit') IS DISTINCT FROM 'number' OR
       (c->>'time_limit')::numeric < 0 OR (c->>'time_limit')::numeric <> trunc((c->>'time_limit')::numeric) OR
       coalesce(c->>'attempts', '') NOT IN ('1', '2', 'unlimited') OR
       jsonb_typeof(c->'required') IS DISTINCT FROM 'boolean' OR
       jsonb_typeof(c->'shuffle') IS DISTINCT FROM 'boolean' OR
       jsonb_typeof(c->'show_answers') IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'การตั้งค่าแบบทดสอบใน Master ไม่ถูกต้อง';
    END IF;
    FOR q IN SELECT value FROM jsonb_array_elements(t.payload->'questions') LOOP
      IF coalesce(btrim(q->>'text'), '') = '' OR coalesce(q->>'type', '') <> 'single' OR
         jsonb_typeof(q->'choices') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'คำถามใน Master ไม่ถูกต้อง';
      END IF;
      IF jsonb_array_length(q->'choices') < 2 OR
         EXISTS (SELECT 1 FROM jsonb_array_elements(q->'choices') x WHERE coalesce(btrim(x->>'text'), '') = '' OR coalesce(x->>'id', '') = '') OR
         (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(q->'choices') x) <> jsonb_array_length(q->'choices') OR
         NOT EXISTS (SELECT 1 FROM jsonb_array_elements(q->'choices') x WHERE x->>'id' = q->>'answer') THEN
        RAISE EXCEPTION 'ตัวเลือกหรือเฉลยใน Master ไม่ถูกต้อง';
      END IF;
      n := n + 1;
      INSERT INTO public.questions(id, lesson_id, kind, no, type, text, choices, answer)
        VALUES (gen_random_uuid()::text, p_lesson, t.kind, n, 'single', q->>'text', q->'choices', q->>'answer');
    END LOOP;
    -- Only copy reusable configuration; never copy deadlines or result state from a master payload.
    c := jsonb_build_object('required', c->'required', 'passing_score', c->'passing_score',
      'time_limit', c->'time_limit', 'attempts', c->'attempts', 'shuffle', c->'shuffle',
      'show_answers', c->'show_answers', 'due', p_due, 'due_time', p_due_time);
    IF t.kind = 'pre' THEN UPDATE public.lessons SET pretest = c WHERE id = p_lesson;
    ELSE UPDATE public.lessons SET posttest = c WHERE id = p_lesson; END IF;
    RETURN p_lesson;
  END IF;

  IF NOT coalesce(l.has_assignment, false) THEN RAISE EXCEPTION 'กรุณาเปิดใช้งานใบงานในบทเรียนก่อน'; END IF;
  IF p_due IS NULL THEN RAISE EXCEPTION 'กรุณากำหนดวันส่งใบงาน'; END IF;
  w := t.payload->'worksheet';
  IF jsonb_typeof(w->'criteria') IS DISTINCT FROM 'array' OR
     jsonb_typeof(w->'allow_file') IS DISTINCT FROM 'boolean' OR
     jsonb_typeof(w->'allow_text') IS DISTINCT FROM 'boolean' OR
     jsonb_typeof(w->'allow_late') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'รายละเอียดใบงานใน Master ไม่ถูกต้อง';
  END IF;
  IF NOT (w->>'allow_file')::boolean AND NOT (w->>'allow_text')::boolean THEN RAISE EXCEPTION 'กรุณาเลือกรูปแบบการส่งงาน'; END IF;
  IF jsonb_array_length(w->'criteria') = 0 OR
     (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(w->'criteria') x) <> jsonb_array_length(w->'criteria') THEN
    RAISE EXCEPTION 'เกณฑ์การให้คะแนนใน Master ไม่ถูกต้อง';
  END IF;
  FOR criterion IN SELECT value FROM jsonb_array_elements(w->'criteria') LOOP
    IF coalesce(criterion->>'id', '') = '' OR coalesce(btrim(criterion->>'name'), '') = '' OR
       jsonb_typeof(criterion->'max') IS DISTINCT FROM 'number' OR (criterion->>'max')::numeric <= 0 THEN
      RAISE EXCEPTION 'ชื่อเกณฑ์หรือคะแนนใน Master ไม่ถูกต้อง';
    END IF;
    total := total + (criterion->>'max')::numeric;
  END LOOP;
  INSERT INTO public.rubrics(id, title, criteria) VALUES (rubric_id, t.title || ' Rubric', w->'criteria');
  INSERT INTO public.assignments(id, lesson_id, course_id, title, instructions, due, due_time,
    allow_late, allow_file, allow_text, points, rubric_id)
  VALUES (new_id, p_lesson, l.course_id, t.title, coalesce(w->>'instructions', ''), p_due, p_due_time,
    (w->>'allow_late')::boolean, (w->>'allow_file')::boolean, (w->>'allow_text')::boolean, total, rubric_id);
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.copy_lesson_material(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.copy_lesson_material(uuid, text, text, text) TO authenticated;
COMMIT;
