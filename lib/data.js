export const DATA = {
  courses: [
    {
      id: "c1",
      code: "NUR301",
      title: "การพยาบาลผู้ใหญ่ 1",
      subtitle: "ระบบหัวใจ หลอดเลือด และทางเดินหายใจ",
      term: "ภาคต้น 2568",
      year: "2568",
      instructor: "อ. ดร. สุภาวดี ทองคำ",
      lessons: 8,
      students: 64,
      progress: 62,
      hero: "#0d6e8c",
    },
    {
      id: "c2",
      code: "NUR302",
      title: "การพยาบาลผู้สูงอายุ",
      subtitle: "ภาวะสมองเสื่อม การพลัดตกหกล้ม และการดูแลแบบองค์รวม",
      term: "ภาคต้น 2568",
      year: "2568",
      instructor: "อ. ดร. สุภาวดี ทองคำ",
      lessons: 6,
      students: 58,
      progress: 35,
      hero: "#1e5fa8",
    },
    {
      id: "c3",
      code: "NUR315",
      title: "การพยาบาลผู้ใหญ่ 2",
      subtitle: "ระบบต่อมไร้ท่อ ไต และภาวะวิกฤต",
      term: "ภาคต้น 2568",
      year: "2568",
      instructor: "อ. กมลชนก ศรีวิไล",
      lessons: 7,
      students: 61,
      progress: 0,
      hero: "#2f7d5b",
    },
    {
      id: "c4",
      code: "NUR210",
      title: "การพยาบาลพื้นฐาน",
      subtitle: "หลักการและทักษะการพยาบาลขั้นพื้นฐาน",
      term: "ภาคปลาย 2567",
      year: "2567",
      instructor: "อ. ดร. สุภาวดี ทองคำ",
      lessons: 10,
      students: 60,
      progress: 100,
      hero: "#5b4b9e",
    },
  ],

  lessons: [
    {
      id: "l1", courseId: "c1", index: 1,
      title: "ภาวะหัวใจล้มเหลว (Heart Failure)",
      duration: "42 นาที",
      desc: "พยาธิสรีรวิทยา อาการแสดง การประเมิน และการพยาบาลผู้ป่วยภาวะหัวใจล้มเหลว",
      video: true,
      pretest: { required: true, taken: true, score: 7, total: 10, questions: 10 },
      posttest: { required: true, taken: false, score: null, total: 10, questions: 10 },
      assignment: { id: "a1", status: "submitted" },
      status: "in-progress", progress: 70,
    },
    {
      id: "l2", courseId: "c1", index: 2,
      title: "กล้ามเนื้อหัวใจตายเฉียบพลัน (Acute MI)",
      duration: "38 นาที",
      desc: "การประเมิน EKG การให้ยาละลายลิ่มเลือด และการพยาบาลในระยะเฉียบพลัน",
      video: true,
      pretest: { required: true, taken: false, score: null, total: 10, questions: 10 },
      posttest: { required: true, taken: false, score: null, total: 10, questions: 10 },
      assignment: { id: "a2", status: "not-submitted" },
      status: "locked-pretest", progress: 0,
    },
    {
      id: "l3", courseId: "c1", index: 3,
      title: "โรคปอดอุดกั้นเรื้อรัง (COPD)",
      duration: "45 นาที",
      desc: "การจัดการทางเดินหายใจ ออกซิเจนบำบัด และการฟื้นฟูสมรรถภาพปอด",
      video: true,
      pretest: { required: true, taken: false, score: null, total: 10, questions: 8 },
      posttest: { required: false, taken: false, score: null, total: 10, questions: 8 },
      assignment: null,
      status: "not-started", progress: 0,
    },
    {
      id: "l4", courseId: "c1", index: 4,
      title: "การพยาบาลผู้ป่วยวิกฤตระบบหายใจ",
      duration: "50 นาที",
      desc: "เครื่องช่วยหายใจ การดูดเสมหะ และการเฝ้าระวังภาวะแทรกซ้อน",
      video: true,
      pretest: { required: true, taken: false, score: null, total: 10, questions: 10 },
      posttest: { required: true, taken: false, score: null, total: 10, questions: 10 },
      assignment: { id: "a3", status: "graded", score: 18, total: 20 },
      status: "not-started", progress: 0,
    },
  ],

  questions: [
    {
      id: "q1", no: 1, type: "single",
      text: "ข้อใดเป็นอาการแสดงที่พบบ่อยที่สุดในผู้ป่วยภาวะหัวใจล้มเหลวด้านซ้าย (Left-sided heart failure)?",
      choices: [
        { id: "a", text: "ขาบวมกดบุ๋ม (Pitting edema)" },
        { id: "b", text: "หายใจลำบากเมื่อนอนราบ (Orthopnea)" },
        { id: "c", text: "ตับโต (Hepatomegaly)" },
        { id: "d", text: "ท้องมาน (Ascites)" },
      ],
      answer: "b",
    },
    {
      id: "q2", no: 2, type: "single",
      text: "ยาในกลุ่มใดที่ใช้เป็นยาหลักในการลด preload ของผู้ป่วยหัวใจล้มเหลว?",
      choices: [
        { id: "a", text: "Beta-blockers" },
        { id: "b", text: "Calcium channel blockers" },
        { id: "c", text: "Loop diuretics (เช่น Furosemide)" },
        { id: "d", text: "Antiplatelets" },
      ],
      answer: "c",
    },
    {
      id: "q3", no: 3, type: "single",
      text: "ตำแหน่งที่เหมาะสมในการจัดท่าผู้ป่วยหัวใจล้มเหลวที่มีภาวะหายใจลำบาก คือข้อใด?",
      choices: [
        { id: "a", text: "นอนราบ (Supine)" },
        { id: "b", text: "นอนตะแคงซ้าย" },
        { id: "c", text: "ท่าศีรษะสูง (Fowler's position)" },
        { id: "d", text: "ท่า Trendelenburg" },
      ],
      answer: "c",
    },
    {
      id: "q4", no: 4, type: "truefalse",
      text: "การชั่งน้ำหนักผู้ป่วยหัวใจล้มเหลวทุกวันในเวลาเดียวกัน เป็นการประเมินภาวะคั่งของน้ำที่สำคัญ",
      choices: [
        { id: "t", text: "ถูก (True)" },
        { id: "f", text: "ผิด (False)" },
      ],
      answer: "t",
    },
    {
      id: "q5", no: 5, type: "single",
      text: "ค่าใดบ่งชี้ภาวะหัวใจล้มเหลวได้ชัดเจนที่สุดจากผลตรวจทางห้องปฏิบัติการ?",
      choices: [
        { id: "a", text: "BNP / NT-proBNP สูง" },
        { id: "b", text: "WBC สูง" },
        { id: "c", text: "Hemoglobin ต่ำ" },
        { id: "d", text: "Albumin ต่ำ" },
      ],
      answer: "a",
    },
  ],

  rubric: {
    id: "r1",
    title: "เกณฑ์ประเมินใบงาน: กรณีศึกษาผู้ป่วยหัวใจล้มเหลว",
    criteria: [
      { id: "rc1", name: "การประเมินสภาพผู้ป่วย (Assessment)", desc: "ครบถ้วน ถูกต้องตามหลักการ", max: 5 },
      { id: "rc2", name: "การวินิจฉัยทางการพยาบาล", desc: "สอดคล้องกับข้อมูล จัดลำดับความสำคัญได้", max: 5 },
      { id: "rc3", name: "การวางแผนและกิจกรรมการพยาบาล", desc: "เหมาะสม ครอบคลุม เป็นรูปธรรม", max: 5 },
      { id: "rc4", name: "การอ้างอิงหลักฐานเชิงประจักษ์", desc: "ใช้แหล่งอ้างอิงที่น่าเชื่อถือ ทันสมัย", max: 5 },
    ],
  },

  assignments: [
    {
      id: "a1", lessonId: "l1", courseId: "c1",
      title: "ใบงานที่ 1 — กรณีศึกษาผู้ป่วยหัวใจล้มเหลว",
      due: "20 มิ.ย. 2568 23:59 น.",
      dueShort: "20 มิ.ย.",
      points: 20,
      instructions:
        "ให้นักศึกษาเลือกผู้ป่วยภาวะหัวใจล้มเหลว 1 ราย จากหอผู้ป่วยอายุรกรรม จัดทำกระบวนการพยาบาล (Nursing Process) ครบทั้ง 5 ขั้นตอน พร้อมอ้างอิงหลักฐานเชิงประจักษ์อย่างน้อย 3 แหล่ง",
      attachments: [
        { name: "แบบฟอร์มกระบวนการพยาบาล.docx", size: "84 KB" },
        { name: "ตัวอย่างกรณีศึกษา.pdf", size: "1.2 MB" },
      ],
      rubricId: "r1",
      allowText: true, allowFile: true,
    },
  ],

  students: [
    { id: "s1", name: "ณัฐนรี วงศ์สวรรค์", no: "65010001", sec: "Sec 1" },
    { id: "s2", name: "ธนกฤต อินทรชัย", no: "65010002", sec: "Sec 1" },
    { id: "s3", name: "พิมพ์ชนก ดวงแก้ว", no: "65010003", sec: "Sec 1" },
    { id: "s4", name: "ศุภวิชญ์ มากมี", no: "65010004", sec: "Sec 2" },
    { id: "s5", name: "อรปรียา สุขใจ", no: "65010005", sec: "Sec 2" },
    { id: "s6", name: "กิตติพศ เรืองศรี", no: "65010006", sec: "Sec 2" },
  ],

  submissions: [
    { id: "sub1", studentId: "s1", assignmentId: "a1", status: "graded", at: "18 มิ.ย. 14:02", file: "case_HF_ณัฐนรี.pdf", score: 18, total: 20, late: false },
    { id: "sub2", studentId: "s2", assignmentId: "a1", status: "submitted", at: "19 มิ.ย. 22:40", file: "ใบงาน1_ธนกฤต.pdf", score: null, total: 20, late: false },
    { id: "sub3", studentId: "s3", assignmentId: "a1", status: "submitted", at: "20 มิ.ย. 08:15", file: "HF_casestudy.docx", score: null, total: 20, late: false },
    { id: "sub4", studentId: "s4", assignmentId: "a1", status: "graded", at: "17 มิ.ย. 19:30", file: "งานหัวใจล้มเหลว.pdf", score: 16, total: 20, late: false },
    { id: "sub5", studentId: "s5", assignmentId: "a1", status: "late", at: "21 มิ.ย. 01:12", file: "case_อรปรียา.pdf", score: null, total: 20, late: true },
    { id: "sub6", studentId: "s6", assignmentId: "a1", status: "not-submitted", at: null, file: null, score: null, total: 20, late: false },
  ],

  testScores: [
    { studentId: "s1", pre: 7, post: 9, total: 10 },
    { studentId: "s2", pre: 5, post: 8, total: 10 },
    { studentId: "s3", pre: 8, post: 10, total: 10 },
    { studentId: "s4", pre: 6, post: 7, total: 10 },
    { studentId: "s5", pre: 4, post: null, total: 10 },
    { studentId: "s6", pre: null, post: null, total: 10 },
  ],

  academicYears: [
    { id: "y68", year: "2568", label: "ปีการศึกษา 2568", start: "1 มิ.ย. 2568", end: "31 พ.ค. 2569", status: "active", courses: 3 },
    { id: "y67", year: "2567", label: "ปีการศึกษา 2567", start: "1 มิ.ย. 2567", end: "31 พ.ค. 2568", status: "archived", courses: 1 },
    { id: "y66", year: "2566", label: "ปีการศึกษา 2566", start: "1 มิ.ย. 2566", end: "31 พ.ค. 2567", status: "archived", courses: 0 },
  ],

  terms: [
    { id: "t1", name: "ภาคต้น", year: "2568", start: "1 มิ.ย. 2568", end: "31 ต.ค. 2568", status: "active" },
    { id: "t2", name: "ภาคปลาย", year: "2568", start: "1 พ.ย. 2568", end: "31 มี.ค. 2569", status: "upcoming" },
    { id: "t3", name: "ภาคฤดูร้อน", year: "2568", start: "1 เม.ย. 2569", end: "31 พ.ค. 2569", status: "upcoming" },
  ],

  subjectGroups: [
    { id: "g1", name: "การพยาบาลผู้ใหญ่และผู้สูงอายุ", head: "อ. ดร. สุภาวดี ทองคำ", courses: 3, status: "active" },
    { id: "g2", name: "การพยาบาลมารดาและทารก", head: "อ. ดร. พรพิมล สุขสันต์", courses: 4, status: "active" },
    { id: "g3", name: "การพยาบาลเด็กและวัยรุ่น", head: "อ. วราภรณ์ ทองดี", courses: 2, status: "active" },
  ],

  sectionList: [
    { id: "sec1", name: "Sec 1", group: "การพยาบาลผู้ใหญ่และผู้สูงอายุ", students: 32, status: "active" },
    { id: "sec2", name: "Sec 2", group: "การพยาบาลผู้ใหญ่และผู้สูงอายุ", students: 32, status: "active" },
  ],
};
