const topics = ["เอกสารประกอบการสอน", "วิดีโอการสอน", "คลิปสาธิตหัตถการ", "กรณีศึกษา", "แบบฝึกหัด & แบบทดสอบ", "ส่งงานออนไลน์"]

export function LandingTopics() {
  return (
    <div className="border-y bg-primary text-primary-foreground">
      <ul className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-8 gap-y-2 px-5 py-5 sm:px-8">
        {topics.map((t) => (
          <li key={t} className="flex items-center gap-2 font-serif">
            <span className="size-1.5 rounded-full bg-primary-foreground" aria-hidden />
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}
