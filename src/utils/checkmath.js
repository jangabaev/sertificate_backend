import { evaluate } from "mathjs";

/**
 * LaTeX'ni basic normalize qilish
 */
function normalizeLatex(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .replace(/\\,/g, "")
    .replace(/\\!/g, "")
    .replace(/\\;/g, "")
    .replace(/\\:/g, "");
}

/**
 * Ichma-ich {} yopilishini topish
 */
function findClosingBrace(str, openIndex) {
  let depth = 0;

  for (let i = openIndex; i < str.length; i++) {
    if (str[i] === "{") depth++;

    if (str[i] === "}") {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * \frac{a}{b} -> ((a)/(b))
 */
function readLatexArg(str, index) {
  if (index >= str.length) {
    throw new Error("Missing argument");
  }

  if (str[index] === "{") {
    const close = findClosingBrace(str, index);

    if (close === -1) {
      throw new Error("Invalid argument braces");
    }

    return {
      content: str.slice(index + 1, close),
      end: close + 1,
    };
  }

  return {
    content: str[index],
    end: index + 1,
  };
}

/**
 * \frac{a}{b}, \frac32, \frac3{2}, \frac{3}2 -> ((a)/(b))
 */
function convertFractions(input) {
  let result = input;

  while (result.includes("\\frac")) {
    const fracIndex = result.lastIndexOf("\\frac");
    const argsStart = fracIndex + "\\frac".length;

    const numerator = readLatexArg(result, argsStart);
    const denominator = readLatexArg(result, numerator.end);

    const converted = `((${numerator.content})/(${denominator.content}))`;

    result =
      result.slice(0, fracIndex) + converted + result.slice(denominator.end);
  }

  return result;
}

/**
 * \sqrt{...} -> sqrt(...)
 * \sqrt5 -> sqrt(5)
 */
function convertSquareRoots(input) {
  let result = input;

  // \sqrt{...}
  while (result.includes("\\sqrt{")) {
    const sqrtIndex = result.lastIndexOf("\\sqrt{");

    const openIndex = result.indexOf("{", sqrtIndex);

    const closeIndex = findClosingBrace(result, openIndex);

    if (closeIndex === -1) {
      throw new Error("Invalid sqrt syntax");
    }

    const content = result.slice(openIndex + 1, closeIndex);

    result =
      result.slice(0, sqrtIndex) +
      `sqrt(${content})` +
      result.slice(closeIndex + 1);
  }

  // \sqrt20 -> sqrt(20)
  result = result.replace(/\\sqrt(-?\d+(?:\.\d+)?)/g, "sqrt($1)");

  return result;
}

/**
 * Oddiy braces
 *
 * {2} -> (2)
 */
function convertBraces(input) {
  let result = input;
  let previous;

  do {
    previous = result;

    result = result.replace(/\{([^{}]+)\}/g, "($1)");
  } while (result !== previous);

  return result;
}

/**
 * LaTeX -> mathjs
 */
function latexToMathExpression(value) {
  let result = normalizeLatex(value);

  // operators
  result = result
    .replace(/\\cdot/g, "*")
    .replace(/\\times/g, "*")
    .replace(/[×·]/g, "*")
    .replace(/\\div/g, "/")
    .replace(/÷/g, "/");

  // constants
  result = result.replace(/\\pi/g, "pi").replace(/π/g, "pi");

  // fractions
  result = convertFractions(result);

  // square roots
  result = convertSquareRoots(result);

  // powers
  result = result.replace(/\^\{([^{}]+)\}/g, "^($1)");

  // braces
  result = convertBraces(result);

  /**
   * ========================================
   * IMPLICIT MULTIPLICATION
   * ========================================
   */

  // 2pi -> 2*pi
  result = result.replace(/(\d|\))(?=pi\b)/g, "$1*");

  // 2sqrt(5) -> 2*sqrt(5)
  result = result.replace(/(\d|\))(?=sqrt\()/g, "$1*");

  // pi(3+4) -> pi*(3+4)
  result = result.replace(/(pi)(?=\()/g, "$1*");

  // 144(1+sqrt(3)) -> 144*(1+sqrt(3))
  result = result.replace(/(\d|\))(?=\()/g, "$1*");

  // )( -> )*(
  result = result.replace(/\)\(/g, ")*(");

  return result;
}

/**
 * Numeric value
 */
function getMathValue(value) {
  const expression = latexToMathExpression(value);

  const result = evaluate(expression);

  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error("Expression numeric qiymat bermadi");
  }

  return result;
}

/**
 * Floating point comparison
 */
function nearlyEqual(a, b) {
  const absoluteTolerance = 1e-6;
  const relativeTolerance = 1e-6;

  const difference = Math.abs(a - b);

  const scale = Math.max(1, Math.abs(a), Math.abs(b));

  return difference <= Math.max(absoluteTolerance, relativeTolerance * scale);
}

/**
 * MAIN
 */
export function isCorrect(userAnswer, correctAnswer) {
  try {
    if (
      userAnswer === null ||
      userAnswer === undefined ||
      correctAnswer === null ||
      correctAnswer === undefined
    ) {
      return false;
    }

    if (userAnswer == correctAnswer) {
      return true;
    }

    const userExpression = latexToMathExpression(userAnswer);

    const correctExpression = latexToMathExpression(correctAnswer);

    const userValue = evaluate(userExpression);

    const correctValue = evaluate(correctExpression);

    if (
      typeof userValue !== "number" ||
      typeof correctValue !== "number" ||
      !Number.isFinite(userValue) ||
      !Number.isFinite(correctValue)
    ) {
      return false;
    }

    const correct = nearlyEqual(userValue, correctValue);

    console.log("ANSWER CHECK:", {
      userAnswer,
      correctAnswer,

      userExpression,
      correctExpression,

      userValue,
      correctValue,

      difference: Math.abs(userValue - correctValue),

      correct,
    });

    return correct;
  } catch (error) {
    console.error("Math answer check error:", {
      userAnswer,
      correctAnswer,
      error: error.message,
    });

    return false;
  }
}
