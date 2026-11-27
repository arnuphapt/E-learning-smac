import { test } from "node:test";
import assert from "node:assert/strict";
import { extractYouTubeId, fileHref } from "../lib/files.ts";

test("extractYouTubeId: supports watch, youtu.be, shorts, and embed URLs", () => {
  assert.equal(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeId("https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=42"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeId("https://m.youtube.com/watch?v=abc_123-XYZ"), "abc_123-XYZ");
  assert.equal(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=token123"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"), "dQw4w9WgXcQ");
  assert.equal(extractYouTubeId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
});

test("extractYouTubeId: returns null for non-YouTube or invalid inputs", () => {
  assert.equal(extractYouTubeId(null), null);
  assert.equal(extractYouTubeId(undefined), null);
  assert.equal(extractYouTubeId(""), null);
  assert.equal(extractYouTubeId("https://example.com/lesson.mp4"), null);
  assert.equal(extractYouTubeId("https://notyoutube.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(extractYouTubeId("https://www.youtube.com/watch"), null);
  assert.equal(extractYouTubeId("/api/files?ref=lessons%2F1%2Fvideo.mp4"), null);
  assert.equal(extractYouTubeId("blob:http://localhost:3000/123"), null);
});

test("fileHref: passes foreign http(s) URLs through and routes R2 refs via /api/files", () => {
  assert.equal(fileHref("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(fileHref("https://cdn.example.com/lesson.mp4"), "https://cdn.example.com/lesson.mp4");
  assert.equal(fileHref("blob:http://localhost:3000/abc"), "blob:http://localhost:3000/abc");
  assert.equal(fileHref("data:text/plain;base64,SGk="), "data:text/plain;base64,SGk=");
  assert.equal(fileHref("lessons/1/video/a.mp4"), "/api/files?ref=lessons%2F1%2Fvideo%2Fa.mp4");
  assert.equal(fileHref("/mock-uploads/lessons/1/a.mp4"), "/api/files?ref=%2Fmock-uploads%2Flessons%2F1%2Fa.mp4");
  assert.equal(fileHref("https://pub-123.r2.dev/lessons/1/a.mp4"), "/api/files?ref=https%3A%2F%2Fpub-123.r2.dev%2Flessons%2F1%2Fa.mp4");
  assert.equal(fileHref("https://pub-123.r2.dev:443/lessons/1/a.mp4"), "/api/files?ref=https%3A%2F%2Fpub-123.r2.dev%3A443%2Flessons%2F1%2Fa.mp4");
  assert.equal(
    fileHref("https://acct.r2.cloudflarestorage.com/bucket/lessons/1/a.mp4"),
    "/api/files?ref=https%3A%2F%2Facct.r2.cloudflarestorage.com%2Fbucket%2Flessons%2F1%2Fa.mp4",
  );
});
