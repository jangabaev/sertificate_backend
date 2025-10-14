import mongoose from "mongoose";

const examSchema = new mongoose.Schema({
    user_id: { type: Number,},
  score: { type: Number },
  test: { type: [String], default: [] },
  name: { type: String,  }
}, { timestamps: true });


export const Exam = mongoose.model("exam", examSchema);
