import { evaluate } from "mathjs";

/**
 * 1. LaTeX'ni tozalash
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
 * Ichma-ich {} bloklarni topish uchun
 *
 * Masalan:
 * \frac{\sqrt{5}}{2}
 */
function findClosingBrace(str, openIndex) {
  let depth = 0;

  for (let i = openIndex; i < str.length; i++) {
    if (str[i] === "{") {
      depth++;
    }

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
 * \frac{a}{b} => ((a)/(b))
 *
 * Nested fractionlarni ham ishlaydi.
 */
function convertFractions(input) {
  let result = input;

  while (result.includes("\\frac")) {
    const fracIndex = result.lastIndexOf("\\frac");

    const firstOpen = result.indexOf("{", fracIndex);

    if (firstOpen === -1) {
      throw new Error("Invalid \\frac syntax");
    }

    const firstClose = findClosingBrace(result, firstOpen);

    if (firstClose === -1) {
      throw new Error("Invalid numerator");
    }

    const secondOpen = result.indexOf("{", firstClose);

    if (secondOpen === -1) {
      throw new Error("Invalid denominator");
    }

    const secondClose = findClosingBrace(result, secondOpen);

    if (secondClose === -1) {
      throw new Error("Invalid denominator");
    }

    const numerator = result.slice(firstOpen + 1, firstClose);
    const denominator = result.slice(secondOpen + 1, secondClose);

    const converted = `((${numerator})/(${denominator}))`;

    result =
      result.slice(0, fracIndex) + converted + result.slice(secondClose + 1);
  }

  return result;
}

/**
 * \sqrt{...} => sqrt(...)
 * \sqrt5 => sqrt(5)
 */
function convertSquareRoots(input) {
  let result = input;

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

  // \sqrt20 => sqrt(20)
  result = result.replace(/\\sqrt(-?\d+(?:\.\d+)?)/g, "sqrt($1)");

  return result;
}

/**
 * {2} yoki {pi} kabi qolgan oddiy braces
 *
 * {2} => (2)
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
 * LaTeX -> mathjs expression
 */
function latexToMathExpression(value) {
  let result = normalizeLatex(value);

  // Operators
  result = result
    .replace(/\\cdot/g, "*")
    .replace(/\\times/g, "*")
    .replace(/[×·]/g, "*")
    .replace(/\\div/g, "/")
    .replace(/÷/g, "/");

  // Constants
  result = result.replace(/\\pi/g, "pi").replace(/π/g, "pi");

  // Fractions
  result = convertFractions(result);

  // Square roots
  result = convertSquareRoots(result);

  // Powers
  // 2^{3} => 2^(3)
  result = result.replace(/\^\{([^{}]+)\}/g, "^($1)");

  // qolgan {}
  result = convertBraces(result);

  /**
   * Yashirin ko'paytirish
   */

  // 2pi => 2*pi
  result = result.replace(/(\d|\))(?=pi)/g, "$1*");

  // 2sqrt(5) => 2*sqrt(5)
  // )sqrt(5) => )*sqrt(5)
  result = result.replace(/(\d|\))(?=sqrt\()/g, "$1*");

  // 2(3+4) => 2*(3+4)
  result = result.replace(/(\d|pi|\))(?=\()/g, "$1*");

  // )( => )*(
  result = result.replace(/\)\(/g, ")*(");

  return result;
}

/**
 * Expression'ni numeric qiymatga aylantirish
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
 * Ikki sonni tolerance bilan solishtirish
 */
function nearlyEqual(a, b) {
  const absoluteTolerance = 1e-6;
  const relativeTolerance = 1e-6;

  const difference = Math.abs(a - b);

  const scale = Math.max(1, Math.abs(a), Math.abs(b));

  return difference <= Math.max(absoluteTolerance, relativeTolerance * scale);
}

/**
 * MAIN FUNCTION
 */
export function isCorrect(userAnswer, correctAnswer) {
  try {
    if (userAnswer === correctAnswer) {
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
