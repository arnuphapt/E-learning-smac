"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "../ui/Icon";

export default function StudentMobileTabbar() {
  const pathname = usePathname() || "";
  
  const onCourses = pathname === "/s/courses" || pathname.startsWith("/s/course") || pathname.startsWith("/s/lesson") || pathname.startsWith("/s/test");
  const onAssignments = pathname.startsWith("/s/assignments") || pathname.startsWith("/s/assignment");
  const onCal = pathname === "/s/calendar";
  const onProfile = pathname === "/s/profile";

  const TabItem = ({ href, icon, label, active }) => (
    <Link
      href={href}
      className={active ? "on" : ""}
      style={{ textDecoration: "none" }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center",
        background: active ? "var(--primary-soft)" : "transparent",
        transition: ".12s"
      }}>
        <Icon name={icon} size={20} />
      </div>
      <span>{label}</span>
    </Link>
  );

  return (
    <div className="tabbar" style={{ background: "rgba(255,255,255,.92)", backdropFilter: "saturate(1.4) blur(12px)" }}>
      <TabItem href="/s/courses"     icon="book"      label="รายวิชา"  active={onCourses} />
      <TabItem href="/s/assignments" icon="clipboard" label="ใบงาน"    active={onAssignments} />
      <TabItem href="/s/calendar"    icon="cal"       label="ปฏิทิน"   active={onCal} />
      <TabItem href="/s/profile"     icon="user"      label="โปรไฟล์"  active={onProfile} />
    </div>
  );
}
