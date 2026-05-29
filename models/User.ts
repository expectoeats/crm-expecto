import bcrypt from "bcryptjs";
import mongoose, { type InferSchemaType, Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true, minlength: 2 },
    email: { type: String, required: [true, "Email is required"], unique: true, trim: true, lowercase: true },
    password: { type: String, required: [true, "Password is required"], minlength: 6, select: false },
    role: { type: String, enum: ["admin", "employee"], default: "employee", required: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    passwordResetRequested: { type: Boolean, default: false },
    passwordResetRequestedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

userSchema.pre("save", async function save() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export type UserDocument = InferSchemaType<typeof userSchema> & {
  comparePassword(candidatePassword: string): Promise<boolean>;
};

export const User = (models.User as mongoose.Model<UserDocument>) || model<UserDocument>("User", userSchema);
