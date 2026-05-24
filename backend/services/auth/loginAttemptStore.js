// =========================
// ✅ LOGIN ATTEMPT STORE
// =========================

const loginAttempts = {};

// =========================
// ✅ GET LOGIN RECORD
// =========================

const getLoginRecord = (username) => {
  return loginAttempts[username];
};

// =========================
// ✅ CREATE LOGIN RECORD
// =========================

const createLoginRecord = (username) => {

  loginAttempts[username] = {
    attempts: 0,
    lockedUntil: null,
  };

  return loginAttempts[username];
};

// =========================
// ✅ INCREMENT ATTEMPTS
// =========================

const incrementAttempts = (username) => {

  if (!loginAttempts[username]) {
    createLoginRecord(username);
  }

  loginAttempts[username].attempts += 1;

  return loginAttempts[username];
};

// =========================
// ✅ RESET ATTEMPTS
// =========================

const resetAttempts = (username) => {

  delete loginAttempts[username];

  console.log("🔄 Login attempts reset:", username);
};

// =========================
// ✅ LOCK ACCOUNT
// =========================

const lockAccount = (username, durationMs) => {

  if (!loginAttempts[username]) {
    createLoginRecord(username);
  }

  loginAttempts[username].lockedUntil =
    Date.now() + durationMs;

  console.log(
    "🚫 Account locked:",
    username
  );
};

// =========================
// ✅ EXPORTS
// =========================

module.exports = {
  getLoginRecord,
  createLoginRecord,
  incrementAttempts,
  resetAttempts,
  lockAccount,
};