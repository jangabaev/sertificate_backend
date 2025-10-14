import mongoose from "mongoose";

const testSchema = new mongoose.Schema({
  score: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  passed: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tests:    { type: testSchema, default: () => ({}) }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
