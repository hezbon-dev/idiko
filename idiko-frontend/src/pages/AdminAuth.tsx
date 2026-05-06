// src/auth/AdminAuth.tsx

// ⚠️ NOTE:
// This is FRONTEND-ONLY authentication.
// It is suitable for MVP / prototype purposes.
// Later this file can be replaced with backend API calls
// without changing the login UI.

export type AdminCredentials = {
  username: string;
  password: string;
};

// 🔐 TEMPORARY ADMIN CREDENTIALS
// Later move this to backend / environment variables
const ADMIN_CREDENTIALS: AdminCredentials = {
  username: "Huduma Kenya",
  password: "@HudumaKenya+254", // change anytime
};

// ✅ Basic username + password validation
export const validateAdminLogin = (
  username: string,
  password: string
): boolean => {
  return (
    username.trim() === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password
  );
};

// 🔒 Future expansion placeholders (DO NOT REMOVE)

// Step 2 (Email / Phone OTP)
export const sendAdminOTP = async (): Promise<boolean> => {
  // Later:
  // - send OTP to email or phone
  // - return success/failure
  return true;
};

// Step 3 (Verify OTP)
export const verifyAdminOTP = async (otp: string): Promise<boolean> => {
  // Later:
  // - verify OTP from backend
  return otp.length > 0;
};

// 🚪 Logout handler (future use)
export const adminLogout = (): void => {
  // Later:
  // - clear auth tokens
  // - clear session
};
