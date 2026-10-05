import { adminDb, assertNoFixtures, cleanFixtures } from "./fixtures.mjs";

export default async function globalTeardown() {
  const db = adminDb();
  await cleanFixtures(db);
  await assertNoFixtures(db);
}
