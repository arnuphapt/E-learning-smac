import Link from "next/link";
import Icon from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <main className="flex items-center justify-center min-h-[70vh] p-4" role="main">
      <div className="card w-full" style={{ maxWidth: 480 }}>
        <div className="empty">
          <div className="ec" aria-hidden="true">
            <Icon name="search" size={26} />
          </div>
          <h1 className="t-2xl fw-7" style={{ margin: 0, color: "var(--fg)" }}>
            ไม่พบหน้าที่ต้องการ
          </h1>
          <p className="muted t-sm center" style={{ margin: 0, maxWidth: 360 }}>
            หน้านี้อาจไม่มีอยู่ ถูกลบไปแล้ว หรือคุณอาจพิมพ์ที่อยู่ไม่ถูกต้อง กรุณาตรวจสอบที่อยู่อีกครั้ง…
          </p>
          <div className="mt-4 flex gap-3 wrap justify-center">
            <Link href="/" className="btn btn-primary">
              <Icon name="home" size={16} />
              <span>กลับหน้าหลัก</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
