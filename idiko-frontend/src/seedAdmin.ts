import { createUser } from "./Services/UserService.ts";

async function seed() {
  await createUser("Huduma Kenya", "@HudumaKenya+254", "admin");
  console.log("✅ Admin credentials seeded");
}

seed();
