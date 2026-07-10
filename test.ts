import { db } from "./src/lib/db";

async function run() {
  const users = await db.user.count();
  const students = await db.student.count();

  console.log("MongoDB connection OK");
  console.log("Users:", users);
  console.log("Students:", students);
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
