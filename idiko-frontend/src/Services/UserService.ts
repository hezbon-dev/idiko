import { db } from "../firebase.ts";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import bcrypt from "bcryptjs";

export type UserRole = "admin" | "staff";

export type UserType = {
  id?: string;
  username: string;
  passwordHash: string;
  role: UserRole;
};

/* ======================================================
   CREATE USER (signup / seed admin/staff)
====================================================== */
export async function createUser(
  username: string,
  password: string,
  role: UserRole
) {
  try {
    // ✅ normalize username (FIX)
    username = username.trim().toLowerCase();

    // prevent duplicate usernames
    const q = query(collection(db, "users"), where("username", "==", username));
    const existing = await getDocs(q);

    if (!existing.empty) {
      console.warn("⚠️ Username already exists");
      return false;
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    await addDoc(collection(db, "users"), {
      username,
      passwordHash,
      role,
    });

    console.log(`✅ User ${username} created in Firebase`);
    return true;
  } catch (err) {
    console.error("❌ Failed to create user:", err);
    return false;
  }
}

/* ======================================================
   SEED EXISTING ADMIN CREDENTIALS FROM AdminAuth.tsx
   ⚠️ Place this here temporarily for one-time seeding
====================================================== */
export async function seedAdminCredentials() {
  // Extracted from AdminAuth.tsx
  const ADMIN_USERNAME = "Huduma Kenya";
  const ADMIN_PASSWORD = "@HudumaKenya+254";

  // ✅ Create admin user in Firebase
  await createUser(ADMIN_USERNAME, ADMIN_PASSWORD, "admin");
}

/* ======================================================
   GET ALL USERS
====================================================== */
export async function getAllUsers(): Promise<UserType[]> {
  const snap = await getDocs(collection(db, "users"));

  return snap.docs.map(d => ({
    id: d.id,
    ...(d.data() as Omit<UserType, "id">),
  }));
}

/* ======================================================
   VALIDATE LOGIN (MAIN HELPER YOU WILL USE)
====================================================== */
export async function validateLogin(
  username: string,
  password: string
): Promise<UserType | null> {
  // ✅ normalize username (FIX)
  username = username.trim().toLowerCase();

  const users = await getAllUsers();

  const user = users.find(u => u.username === username);
  if (!user) return null;

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) return null;

  return user;
}

/* ======================================================
   LOGIN USER (BOOLEAN HELPER FOR ADMIN/STAFF PAGES)
====================================================== */
export async function loginUser(
  username: string,
  password: string,
  role: UserRole
): Promise<boolean> {
  const user = await validateLogin(username, password);

  if (!user) return false;

  return user.role === role;
}
