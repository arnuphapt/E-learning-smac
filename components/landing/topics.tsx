const topics = ["เอกสารประกอบการสอน", "วิดีโอการสอน", "คลิปสาธิตหัตถการ", "กรณีศึกษา", "แบบฝึกหัด & แบบทดสอบ", "ส่งงานออนไลน์"]

export function LandingTopics() {
  return (
    <div className="strip" aria-hidden="true">
      <div className="strip-row">
        {topics.map((t) => (
          <span key={`a-${t}`} className="strip-item">
            <span className="dot" />
            {t}
          </span>
        ))}
        {topics.map((t) => (
          <span key={`b-${t}`} className="strip-item">
            <span className="dot" />
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
