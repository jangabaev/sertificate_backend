import prisma from "../lib/prisma.js";
import TelegramBot from "node-telegram-bot-api";
import { generatePDF } from "../utils/generatepdf.js";

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: false,
});

function getDegree(totalBall) {
  if (totalBall >= 70) return "A+";
  if (totalBall >= 65) return "A";
  if (totalBall >= 60) return "B";
  if (totalBall >= 55) return "B+";
  if (totalBall >= 50) return "C+";
  if (totalBall >= 46) return "C";
  return "NC";
}

function calcGradeStats(students) {
  const stats = { "A+": 0, "A": 0, "B": 0, "B+": 0, "C+": 0, "C": 0, "NC": 0 };
  students.forEach((s) => {
    const g = getDegree(s.total_ball);
    stats[g]++;
  });
  return stats;
}

export const getRashmodule = async (req, res) => {
  try {
    const { examId } = req.params;

    const respon = await prisma.test.findFirst({ where: { id: Number(examId) } });
    if (!respon) {
      return res.status(404).json([]);
    }

    const responce = Array.isArray(respon.students) ? respon.students : [];
    const students_count = responce.length;
    const trueAnswer = respon.responce;

    let new_students = [];
    let currect_answers = new Array(trueAnswer.length).fill(0);

    responce.forEach((el) => {
      const testTrueFalse = [];
      el.responce.forEach((ans, index) => {
        const isCorrect =
          ans?.toLocaleLowerCase() === trueAnswer[index]?.toLocaleLowerCase() ? 1 : 0;
        currect_answers[index] += isCorrect;
        testTrueFalse.push(isCorrect);
      });
      new_students.push({
        user_id: el.id,
        name: el.name,
        test: testTrueFalse,
      });
    });

    const possiblity = currect_answers.map((el) => {
      const p = el / students_count;
      if (p === 0 || p === 1) return 4 * (1 - p);
      return -Math.log(p / (1 - p));
    });

    const min = Math.min(...possiblity);
    let summa_ball = 0;
    const balls = possiblity.map((poss) => {
      const b = min * -1 + poss + 1;
      summa_ball += b;
      return b;
    });

    let skills_array = [];
    new_students = new_students.map((el) => {
      let currect = 0;
      el.test.forEach((isCorrect, idx) => {
        currect += isCorrect * balls[idx];
      });
      currect = currect === 0 ? 1 : currect;
      const incorect = summa_ball - currect !== 0 ? summa_ball - currect : 1;
      const skill = Math.log(currect / incorect);
      skills_array.push(skill);
      return { ...el, incorect, currect, skill };
    });

    const skil_calculateMean =
      skills_array.reduce((acc, v) => acc + v, 0) / students_count;
    const skil_root = Math.sqrt(
      skills_array.reduce((acc, v) => acc + v ** 2, 0) / students_count
    );

    new_students = new_students.map((el) => {
      const z_coficent = (el.skill - skil_calculateMean) / skil_root;
      const total_ball = 50 + z_coficent * 20;
      return { ...el, total_ball, skil_calculateMean, skil_root };
    });

    const grade_stats = calcGradeStats(new_students);

    res.status(200).json({ students_count, grade_stats, new_students, name: respon.name });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const stopRashmodule = async (req, res) => {
  try {
    const { examId } = req.params;

    const respon = await prisma.test.findFirst({ where: { id: Number(examId) } });
    if (!respon) {
      return res.status(404).json([]);
    }

    const responce = Array.isArray(respon.students) ? respon.students : [];
    const students_count = responce.length;
    const trueAnswer = respon.responce;

    let new_students = [];
    let currect_answers = new Array(trueAnswer.length).fill(0);

    responce.forEach((el) => {
      const testTrueFalse = [];
      el.responce.forEach((ans, index) => {
        const isCorrect =
          ans?.toLocaleLowerCase() === trueAnswer[index]?.toLocaleLowerCase() ? 1 : 0;
        currect_answers[index] += isCorrect;
        testTrueFalse.push(isCorrect);
      });
      new_students.push({
        user_id: el.id,
        name: el.name,
        test: testTrueFalse,
      });
    });

    const possiblity = currect_answers.map((el) => {
      const p = el / students_count;
      if (p === 0 || p === 1) return 4 * (1 - p);
      return -Math.log(p / (1 - p));
    });

    const min = Math.min(...possiblity);
    let summa_ball = 0;
    const balls = possiblity.map((poss) => {
      const b = min * -1 + poss + 1;
      summa_ball += b;
      return b;
    });

    let skills_array = [];
    new_students = new_students.map((el) => {
      let currect = 0;
      el.test.forEach((isCorrect, idx) => {
        currect += isCorrect * balls[idx];
      });
      const incorect = summa_ball - currect !== 0 ? summa_ball - currect : 1;
      const skill = Math.log((currect || 1) / incorect);
      skills_array.push(skill);
      return { ...el, incorect, currect, skill };
    });

    const skil_calculateMean =
      skills_array.reduce((acc, v) => acc + v, 0) / students_count;
    const skil_root = Math.sqrt(
      skills_array.reduce((acc, v) => acc + v ** 2, 0) / students_count
    );

    new_students = new_students.map((el) => {
      const z_coficent = (el.skill - skil_calculateMean) / skil_root;
      const total_ball = 50 + z_coficent * 20;
      return { ...el, total_ball, skil_calculateMean, skil_root };
    });

    const pdfFolder = await generatePDF(respon.name, new_students, respon.responce.length);

    for (const student of new_students) {
      if (!student.user_id) continue;

      const findStudent = await prisma.user.findFirst({
        where: { user_id: student.user_id },
      });
      if (!findStudent) continue;

      const currentTests = Array.isArray(findStudent.tests) ? findStudent.tests : [];
      currentTests.push({
        id: respon.id,
        score: student.total_ball,
        degree: "A+",
        name: respon.name,
        date: "",
        test_type: "Rash",
      });

      await prisma.user.update({
        where: { id: findStudent.id },
        data: { tests: currentTests },
      });

      const pdfPath = `${pdfFolder}/${student.name.replace(/\s+/g, "_")}.pdf`;
      try {
        await bot.sendDocument(student.user_id, pdfPath, {
          caption: `📄 ${respon.name} natijalari tayyor!\nUmumiy ball: ${student.total_ball.toFixed(2)}`,
        });
      } catch (err) {
        console.error("Error sending to user", student.user_id, err.message);
      }
    }

    const grade_stats = calcGradeStats(new_students);

    res.status(200).json({ students_count, grade_stats, new_students, name: respon.name });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
