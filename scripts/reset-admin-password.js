/**
 * Reset admin password:
 *   node scripts/reset-admin-password.js
 *
 * MONGODB_URI must be set in .env.local before running.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set in .env.local");
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  role: { type: String, default: "employee" },
  phone: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

async function main() {
  await mongoose.connect(uri);
  const User = mongoose.models.User || mongoose.model("User", userSchema);

  const email = "admin@example.com";   // ← apna admin email yahan dalo
  const newPassword = "Admin@1234";    // ← naya password yahan dalo

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await User.updateOne({ email }, { $set: { password: hashed } });

  console.log(`✅ Password reset for: ${email}`);
  console.log(`   New password: ${newPassword}`);
  console.log("\n⚠️  Change this password after logging in!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
