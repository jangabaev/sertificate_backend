import { calculateResult } from "../utils/calculateResult.js";
import fs from "fs";

export const calculateTestResult = async (userAnswers) => {
  // JSON faylni sinxron o‘qish
  const raw = fs.readFileSync(new URL("../data/questions.json", import.meta.url));
  const questions = JSON.parse(raw.toString());

  const correctAnswers = questions.map((q) => q.correct);
  const result = calculateResult(userAnswers, correctAnswers);

  return {
    totalQuestions: correctAnswers.length,
    correct: result.correct,
    score: ((result.correct / correctAnswers.length) * 100).toFixed(2),
  };
};
