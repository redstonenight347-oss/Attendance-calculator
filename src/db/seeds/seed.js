import { db } from "../db.js";
import { users, subjects, timetable, attendanceLogs } from "../schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// config
const USER_NAME = "test User4";
const USER_EMAIL = "test4@test.com";
const USER_PASSWORD = "password101112";
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const PERIODS_PER_DAY = 6;
const TOTAL_DAYS = 120; // ~4 months of logs

const SUBJECT_NAMES = ["JAVA", "COA", "OOPs", "English", "EVS", "JAVA Lab", "OS Lab"];

// helper
function getRandomStatus() {
  const r = Math.random();

  if (r < 0.75) return "present";     // 75%
  if (r < 0.9) return "absent";       // 15%
  return "cancelled";                 // 10%
}

function getRandomSubjectId(subjects) {
  return subjects[Math.floor(Math.random() * subjects.length)].id;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// main seed
async function seed() {
  console.log("Starting DB seeding...");

  // Clean up any existing seed user to make the seed script fully idempotent
  console.log("Cleaning up existing seed user data...");
  await db.delete(users).where(eq(users.email, USER_EMAIL));

  // Securely hash the password before seeding
  console.log("Hashing password...");
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(USER_PASSWORD, salt);

  // 1. insert user
  console.log("Inserting user...");
  const [insertedUser] = await db.insert(users).values({
    name: USER_NAME,
    email: USER_EMAIL,
    password: hashedPassword,
  }).returning();

  const currentUserId = insertedUser.id;

  // 2. insert subjects
  console.log("Inserting subjects...");
  const insertedSubjects = await db
    .insert(subjects)
    .values(
      SUBJECT_NAMES.map((name) => ({
        userId: currentUserId,
        name,
      }))
    )
    .returning();

  console.log("Subjects inserted");

  // 3. create timetable
  console.log("Creating timetable data...");
  const timetableData = [];

  for (const day of DAYS) {
    for (let p = 1; p <= PERIODS_PER_DAY; p++) {
      timetableData.push({
        userId: currentUserId,
        subjectId: getRandomSubjectId(insertedSubjects),
        dayOfWeek: day,
        periodNumber: p,
      });
    }
  }

  const insertedTimetable = await db
    .insert(timetable)
    .values(timetableData)
    .returning();

  console.log("Timetable created");

  // 4. generate attendance logs
  console.log("Generating attendance logs...");
  const logs = [];

  let startDate = new Date("2026-01-01");

  for (let d = 0; d < TOTAL_DAYS; d++) {
    const currentDate = addDays(startDate, d);

    const dayName = currentDate
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    // skip weekends
    if (!DAYS.includes(dayName)) continue;

    for (const slot of insertedTimetable) {
      if (slot.dayOfWeek !== dayName) continue;

      logs.push({
        userId: currentUserId,
        timetableId: slot.id,
        date: currentDate.toISOString().split("T")[0],
        status: getRandomStatus(),
      });
    }
  }

  console.log(`Generated ${logs.length} logs`);

  // 5. bulk insert (chunked to avoid memory issues)
  console.log("Bulk inserting attendance logs into DB...");
  const CHUNK_SIZE = 500;

  for (let i = 0; i < logs.length; i += CHUNK_SIZE) {
    const chunk = logs.slice(i, i + CHUNK_SIZE);

    await db.insert(attendanceLogs).values(chunk);
  }

  console.log("Logs inserted successfully");
}

seed()
  .then(() => {
    console.log("Seeding complete successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Critical seeding error:", err);
    process.exit(1);
  });
