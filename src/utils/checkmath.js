import { evaluate } from "mathjs";

export function isCorrect(userAnswer, correctAnswer) {
  try {
    const userValue = evaluate(userAnswer);
    const correctValue = evaluate(correctAnswer);

    return Math.abs(userValue - correctValue) < 0.001;
  } catch {
    return false;
  }
}