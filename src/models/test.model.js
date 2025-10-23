import mongoose from "mongoose";

const textSchema = new mongoose.Schema({
  user_id: { type: Number,},
  score: { type: Number },
  test: { type: [String], default: [] },
  name: { type: String,  }
}, { timestamps: true });


export const Test = mongoose.model("Test", textSchema);
