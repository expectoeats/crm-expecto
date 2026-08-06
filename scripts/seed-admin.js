/**
 * Run once to create the first admin user:
 *   node scripts/seed-admin.js
 *
 * Set MONGODB_URI in .env.local before running.
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
  passwordResetRequested: { type: Boolean, default: false },
  passwordResetRequestedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

async function main() {
  await mongoose.connect(uri);
  const User = mongoose.models.User || mongoose.model("User", userSchema);

  const email = "admin@example.com";
  const plainPassword = "Admin@1234";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`User ${email} already exists. No changes made.`);
    process.exit(0);
  }

  const hashed = await bcrypt.hash(plainPassword, 10);
  await User.create({ name: "Admin", email, password: hashed, role: "admin" });

  console.log("✅ Admin user created:");
  console.log("   Email   :", email);
  console.log("   Password:", plainPassword);
  console.log("\n⚠️  Change the password after first login!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
