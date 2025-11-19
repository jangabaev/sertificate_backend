import mongoose from "mongoose";

const currentAnswerSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  score: { type: Number, default: 0 },
  test: { type: [String], default: [] },
  name: { type: String, required: true },
});

const examSchema = new mongoose.Schema(
  {
    name: { type: String },
    currect_answer: { type: [String], default: [] },
    tests: { type: [currentAnswerSchema], default: [] },
    test_type: {
      type: String,
      enum: ["rash", "standard"],
      default: "standard",
    },
  },
  { timestamps: true }
);

export const Exam = mongoose.model("Exam1", examSchema);
