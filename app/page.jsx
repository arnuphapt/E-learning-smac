"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import "./landing.css";

function ImageSlot({ placeholder, shape = "rounded", radius = 22, ratio = "16/11" }) {
  return (
    <div style={{
      width: "100%", aspectRatio: ratio,
      background: "repeating-linear-gradient(45deg, #f8f9fa, #f8f9fa 12px, #fff 12px, #fff 24px)",
      border: "1.5px dashed #cbd5e1",
      borderRadius: shape === "rounded" ? radius : 0,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      color: "#64748b", textAlign: "center", padding: 24,
      boxShadow: "inset 0 0 20px rgba(0,0,0,0.02)"
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10, opacity: 0.6 }}>
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <circle cx="9" cy="9" r="2"/>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{placeholder}</span>
    </div>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const containerRef = React.useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
    );
    
    // Slight delay to ensure DOM is fully painted
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.querySelectorAll(".reveal").forEach((el) => io.observe(el));
      }
    }, 100);

    return () => io.disconnect();
  }, []);

  return (
    <div className="landing-body" ref={containerRef}>
      {/* NAV */}
      <nav className={`nav ${scrolled ? "scrolled" : ""}`} id="nav">
        <div className="nav-in">
          <a className="brand" href="#top">
            <span className="mk">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10 12 5 2 10l10 5 10-5Z" />
                <path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" />
              </svg>
            </span>
            <span>NurseLearn<small>การพยาบาลผู้ใหญ่และผู้สูงอายุ</small></span>
          </a>
          <div className="nav-links">
            <a href="#about">เกี่ยวกับระบบ</a>
            <a href="#features">จุดเด่น</a>
            <a href="#mission">วิสัยทัศน์</a>
          </div>
          <Link className="btn btn-primary" href="/login">
            เข้าสู่ระบบ
            <svg className="ar" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero" id="top">
        <div className="hero-bg"></div>
        <div className="hero-mesh"></div>
        <svg className="ekg" height="120" viewBox="0 0 1600 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,60 L420,60 L450,60 L470,30 L500,95 L525,15 L552,60 L600,60 L1010,60 L1040,60 L1062,28 L1092,96 L1118,18 L1144,60 L1200,60 L1600,60" />
        </svg>
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="eyebrow reveal in">วิทยาลัยพยาบาลศรีมหาสารคาม · สถาบันพระบรมราชชนก</span>
              <h1 className="reveal in d1">ยินดีต้อนรับสู่<br /><span className="hl">ระบบการเรียนรู้ออนไลน์</span></h1>
              <div className="sub serif reveal in d1">กลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ</div>
              <p className="lead reveal in d2">พื้นที่แห่งการเรียนรู้ที่ออกแบบมาเพื่อสนับสนุนการศึกษาของนักศึกษาพยาบาลให้เกิดประสิทธิภาพสูงสุด ทั้งในและนอกชั้นเรียน — เพียงเข้าสู่ระบบก็พร้อมเริ่มต้นการเรียนรู้ได้ทันที</p>
              <div className="hero-cta reveal in d2">
                <Link className="btn btn-primary btn-lg" href="/login">เริ่มเรียนรู้
                  <svg className="ar" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
                <a className="btn btn-ghost btn-lg" href="#features">รู้จักระบบ</a>
              </div>
              <div className="hero-trust reveal in d3">
                <span className="av"><span>นศ</span><span>พย</span><span>3</span></span>
                เปิดให้เข้าถึงได้ตลอด 24 ชั่วโมง บนทุกอุปกรณ์
              </div>
            </div>
            <div className="hero-visual reveal in d2">
              <span className="dotgrid dg1"></span>
              <div className="hero-frame">
                <ImageSlot placeholder="ภาพนักศึกษาพยาบาล / การเรียนการสอน" ratio="4/5" radius={26} />
              </div>
              <div className="hero-badge hb-1">
                <span className="ic" style={{ background: "var(--mint)", color: "var(--teal)" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" /><path d="M12 6v6l4 2" /></svg>
                </span>
                <div><div className="t">24 ชม.</div><div className="d">เรียนได้ไม่จำกัดเวลา</div></div>
              </div>
              <div className="hero-badge hb-2">
                <span className="ic" style={{ background: "var(--coral-soft)", color: "var(--coral)" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l5-3v10l-5-3M2 6.5A1.5 1.5 0 0 1 3.5 5h9A1.5 1.5 0 0 1 14 6.5v11A1.5 1.5 0 0 1 12.5 19h-9A1.5 1.5 0 0 1 2 17.5z" /></svg>
                </span>
                <div><div className="t">วิดีโอ + สื่อ</div><div className="d">สื่อการสอนหลากหลาย</div></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MARQUEE STRIP */}
      <div className="strip" aria-hidden="true">
        <div className="strip-row">
          <span className="strip-item"><span className="dot"></span>เอกสารประกอบการสอน</span>
          <span className="strip-item"><span className="dot"></span>วิดีโอการสอน</span>
          <span className="strip-item"><span className="dot"></span>คลิปสาธิตหัตถการ</span>
          <span className="strip-item"><span className="dot"></span>กรณีศึกษา</span>
          <span className="strip-item"><span className="dot"></span>แบบฝึกหัด &amp; แบบทดสอบ</span>
          <span className="strip-item"><span className="dot"></span>ส่งงานออนไลน์</span>
          {/* duplicate for continuous effect */}
          <span className="strip-item"><span className="dot"></span>เอกสารประกอบการสอน</span>
          <span className="strip-item"><span className="dot"></span>วิดีโอการสอน</span>
          <span className="strip-item"><span className="dot"></span>คลิปสาธิตหัตถการ</span>
          <span className="strip-item"><span className="dot"></span>กรณีศึกษา</span>
          <span className="strip-item"><span className="dot"></span>แบบฝึกหัด &amp; แบบทดสอบ</span>
          <span className="strip-item"><span className="dot"></span>ส่งงานออนไลน์</span>
        </div>
      </div>

      {/* ABOUT / STATEMENT */}
      <section className="section statement" id="about">
        <div className="wrap">
          <span className="eyebrow reveal">เกี่ยวกับระบบ</span>
          <p className="big reveal d1" style={{ marginTop: 24 }}>ระบบ E-learning แห่งนี้รวบรวม<b>รายวิชาในกลุ่มการพยาบาลผู้ใหญ่และผู้สูงอายุ</b>ไว้อย่างครบถ้วน ครอบคลุมตั้งแต่หลักการพยาบาลพื้นฐาน การดูแลผู้ป่วยที่มีภาวะเจ็บป่วยเฉียบพลันและเรื้อรัง ไปจนถึง<b>การพยาบาลผู้สูงอายุแบบองค์รวม</b></p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features" style={{ background: "var(--paper)" }}>
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">จุดเด่นของระบบ</span>
            <h2>ทุกสิ่งที่นักศึกษาต้องการ<br />เพื่อการเรียนรู้ที่มีประสิทธิภาพ</h2>
          </div>

          <div className="feat-list">
            <article className="feat reveal">
              <div className="feat-copy">
                <div className="feat-num">๐๑ — ยืดหยุ่น</div>
                <h3>เรียนได้ทุกที่ ทุกเวลา ไม่จำกัด</h3>
                <p>เข้าเรียนได้ไม่จำกัดจำนวนครั้งและไม่จำกัดเวลา ทั้งทบทวนก่อนสอบ เรียนเสริมในหัวข้อที่ยังไม่เข้าใจ หรือเรียนล่วงหน้าเพื่อเตรียมความพร้อม ระบบเปิดให้เข้าถึงตลอด 24 ชั่วโมง ช่วยให้บริหารเวลาเรียนได้อย่างอิสระ เหมาะกับวิถีชีวิตของนักศึกษาพยาบาล</p>
                <div className="feat-chips">
                  <span className="chip"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>ตลอด 24 ชั่วโมง</span>
                  <span className="chip">คอมพิวเตอร์</span>
                  <span className="chip">แท็บเล็ต</span>
                  <span className="chip">มือถือ</span>
                </div>
              </div>
              <div className="feat-media">
                <div className="feat-illu" style={{ background: "linear-gradient(140deg,var(--teal),var(--teal-deep))" }}>
                  <span className="ring" style={{ width: 120, height: 120 }}></span>
                  <span className="ring" style={{ width: 200, height: 200 }}></span>
                  <span className="ring" style={{ width: 280, height: 280 }}></span>
                  <svg className="glyph" width="92" height="92" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></svg>
                </div>
              </div>
            </article>

            <article className="feat rev reveal">
              <div className="feat-copy">
                <div className="feat-num">๐๒ — สื่อคุณภาพ</div>
                <h3>สื่อการเรียนรู้ที่หลากหลายและทันสมัย</h3>
                <p>ประกอบด้วยเอกสารประกอบการสอน สไลด์บรรยาย วิดีโอการสอน คลิปสาธิตหัตถการทางการพยาบาล กรณีศึกษา และแหล่งความรู้เพิ่มเติม จัดทำและคัดสรรโดยคณาจารย์ผู้เชี่ยวชาญ เพื่อให้เข้าใจเนื้อหาได้ลึกซึ้งและนำไปประยุกต์ใช้ในการปฏิบัติจริงได้อย่างมั่นใจ</p>
                <div className="feat-chips">
                  <span className="chip">วิดีโอการสอน</span>
                  <span className="chip">คลิปสาธิตหัตถการ</span>
                  <span className="chip">กรณีศึกษา</span>
                </div>
              </div>
              <div className="feat-media">
                <div className="feat-card">
                  <ImageSlot placeholder="ภาพสื่อการสอน / วิดีโอ" />
                </div>
              </div>
            </article>

            <article className="feat reveal">
              <div className="feat-copy">
                <div className="feat-num">๐๓ — ประเมินตนเอง</div>
                <h3>ฝึกฝนและประเมินตนเองผ่านแบบฝึกหัด</h3>
                <p>มีแบบฝึกหัดและแบบทดสอบในแต่ละหน่วยการเรียน เพื่อทบทวนและประเมินความเข้าใจของตนเองอย่างต่อเนื่อง การฝึกทำอย่างสม่ำเสมอช่วยเสริมความรู้ให้แม่นยำ พัฒนาทักษะการคิดวิเคราะห์ และเตรียมพร้อมสำหรับการสอบขึ้นทะเบียนใบประกอบวิชาชีพการพยาบาลในอนาคต</p>
                <div className="feat-chips">
                  <span className="chip">Pre-test / Post-test</span>
                  <span className="chip">เฉลยพร้อมคำอธิบาย</span>
                  <span className="chip">ติดตามพัฒนาการ</span>
                </div>
              </div>
              <div className="feat-media">
                <div className="feat-illu" style={{ background: "linear-gradient(140deg,#1c7e6b,var(--teal-deep))" }}>
                  <span className="ring" style={{ width: 140, height: 140 }}></span>
                  <span className="ring" style={{ width: 230, height: 230 }}></span>
                  <svg className="glyph" width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" /><path d="M8 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="m9 14 2 2 4-4" /></svg>
                </div>
              </div>
            </article>

            <article className="feat rev reveal">
              <div className="feat-copy">
                <div className="feat-num">๐๔ — สะดวก</div>
                <h3>ส่งการบ้านสะดวกผ่านระบบออนไลน์</h3>
                <p>รองรับการส่งงานและการบ้านผ่านช่องทางออนไลน์ได้โดยตรง อัปโหลดงานภายในเวลาที่กำหนด ติดตามสถานะการส่ง และรับผลตอบกลับจากอาจารย์ผู้สอนได้อย่างเป็นระบบ ช่วยลดขั้นตอนที่ยุ่งยาก และทำให้การสื่อสารระหว่างผู้เรียนกับผู้สอนเป็นไปอย่างราบรื่น</p>
                <div className="feat-chips">
                  <span className="chip">อัปโหลดไฟล์งาน</span>
                  <span className="chip">ติดตามสถานะ</span>
                  <span className="chip">ผลตอบกลับจากอาจารย์</span>
                </div>
              </div>
              <div className="feat-media">
                <div className="feat-card">
                  <ImageSlot placeholder="ภาพการส่งงานออนไลน์" />
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="section mission" id="mission">
        <div className="wrap">
          <span className="eyebrow reveal">วิสัยทัศน์</span>
          <h2 className="reveal d1">ก้าวสู่การเป็น<em>พยาบาลวิชาชีพ</em>ที่มีคุณภาพ พร้อมดูแลผู้ใช้บริการด้วย<em>หัวใจความเป็นมนุษย์</em> <span className="heart">♥</span></h2>
          <p className="reveal d2">เราหวังเป็นอย่างยิ่งว่าระบบ E-learning แห่งนี้จะเป็นเครื่องมือสำคัญที่ช่วยส่งเสริมการเรียนรู้ให้เกิดประสิทธิภาพ ควบคู่ไปกับการบ่มเพาะความรู้ ทักษะ และจิตวิญญาณความเป็นพยาบาล</p>
        </div>
      </section>

      {/* SIGNATURE */}
      <section className="sign">
        <div className="wrap">
          <div className="sign-card reveal">
            <span className="quote-mark serif">”</span>
            <div className="body">
              <p>ขอให้นักศึกษาทุกคนมีความสุขกับการเรียนรู้ และประสบความสำเร็จในเส้นทางวิชาชีพการพยาบาล</p>
              <div className="sign-foot">
                <span className="seal">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" /><path d="M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /></svg>
                </span>
                <div className="who">
                  <div className="a">ด้วยความปรารถนาดี</div>
                  <div className="b">คณาจารย์กลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ</div>
                  <div className="c">วิทยาลัยพยาบาลศรีมหาสารคาม · คณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="wrap">
          <div className="cta-box reveal">
            <svg className="ekg2" height="70" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true"><path d="M0,35 L500,35 L520,35 L538,12 L560,62 L580,6 L600,35 L700,35 L1200,35" fill="none" stroke="#fff" strokeWidth="2" /></svg>
            <div className="in">
              <h2>พร้อมเริ่มต้นการเรียนรู้แล้วหรือยัง?</h2>
              <p>เข้าสู่ระบบเพื่อเข้าถึงรายวิชา บทเรียน วิดีโอการสอน และแบบทดสอบทั้งหมดของคุณ</p>
              <Link className="btn btn-primary btn-lg" href="/s/courses">เข้าสู่ระบบ NurseLearn<svg className="ar" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="wrap">
          <div className="footer-grid">
            <div>
              <div className="brand">
                <span className="mk"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" /></svg></span>
                <span>NurseLearn<small>การพยาบาลผู้ใหญ่และผู้สูงอายุ</small></span>
              </div>
              <p className="desc">ระบบการเรียนรู้ออนไลน์สำหรับนักศึกษาพยาบาล วิทยาลัยพยาบาลศรีมหาสารคาม คณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก</p>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <h4>ระบบ</h4>
                <Link href="/s/courses">เข้าสู่ระบบ</Link>
                <a href="#features">จุดเด่น</a>
                <a href="#about">เกี่ยวกับ</a>
              </div>
              <div className="footer-col">
                <h4>สำหรับผู้เรียน</h4>
                <Link href="/s/courses">รายวิชา</Link>
                <Link href="/s/courses">แบบทดสอบ</Link>
                <Link href="/s/courses">ส่งงาน</Link>
              </div>
              <div className="footer-col">
                <h4>ติดต่อ</h4>
                <a href="#">กลุ่มวิชาฯ</a>
                <a href="#">ฝ่ายสนับสนุน</a>
              </div>
            </div>
          </div>
          <div className="footer-bot">
            <span>© 2568 วิทยาลัยพยาบาลศรีมหาสารคาม · สถาบันพระบรมราชชนก</span>
            <span>ออกแบบเพื่อการเรียนรู้ของนักศึกษาพยาบาล</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
