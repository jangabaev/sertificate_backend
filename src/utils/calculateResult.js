export const calculateResult = (userAnswers, correctAnswers) => {
  let correct = 0;

  for (let i = 0; i < correctAnswers.length; i++) {
    if (userAnswers[i] === correctAnswers[i]) {
      correct++;
    }
  }

  return { correct };
};

export const uppercasetoLowercase = (str) => {
  return str.toLocaleLowerCase();
};
