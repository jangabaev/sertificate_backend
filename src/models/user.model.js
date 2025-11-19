import mongoose from "mongoose";

const testSchema = new mongoose.Schema({
  score: { type: Number, default: 0 },
  degree: { type: String, default: "" },
  name: { type: String, default: "" },
  date: { type: String, default: "" },
  test_type: { type: String, default: "" },
});

const userSchema = new mongoose.Schema(
  {
    user_id: { type: Number, required: true },
    username: { type: String },
    first_name: { type: String },
    last_name: { type: String },
    tests: { type: [testSchema], default: () => [] },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
