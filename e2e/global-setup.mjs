import { adminDb, cleanFixtures, seedFixtures, mintSessions } from "./fixtures.mjs";

export default async function globalSetup(config) {
  const db = adminDb();
  const origin = config.projects[0].use.baseURL;
  await cleanFixtures(db); // leftovers of a crashed run
  try {
    await seedFixtures(db);
    await mintSessions(db, origin);
  } catch (e) {
    await cleanFixtures(db).catch(() => {});
    throw e;
  }
}
