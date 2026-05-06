import { createUser } from "./Services/UserService";

async function seed() {
  await createUser("admin", "admin123", "admin");
  await createUser("staff1", "staff123", "staff");
  console.log("✅ Users seeded");
}

seed();
