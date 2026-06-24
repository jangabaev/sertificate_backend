import prisma from "../lib/prisma.js";
import TelegramBot from "node-telegram-bot-api";
import { generatePDF } from "../utils/generatepdf.js";
import { isCorrect } from "../utils/checkmath.js";

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
  const stats = { "A+": 0, A: 0, B: 0, "B+": 0, "C+": 0, C: 0, NC: 0 };
  students.forEach((s) => {
    const g = getDegree(s.total_ball);
    stats[g]++;
  });
  return stats;
}

function getJsonObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

// Hisoblash logikasi - ikkala endpoint ham shu funksiyani ishlatadi
function calculateRash(responce, trueAnswer) {
  const students_count = responce.length;

  let new_students = [];
  let currect_answers = new Array(trueAnswer.length).fill(0);

  responce.forEach((el) => {
    const testTrueFalse = [];
    el.responce.forEach((ans, index) => {
      const correct =
        (index > 35
          ? isCorrect(ans, trueAnswer[index])
          : ans?.toLocaleLowerCase() === trueAnswer[index]?.toLocaleLowerCase())
          ? 1
          : 0;
      currect_answers[index] += correct;
      testTrueFalse.push(correct);
    });
    new_students.push({
      user_id: el.id,
      name: el.name,
      test: testTrueFalse,
      imported: el.imported ?? false,
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
    let currect = el.test.reduce((acc, isC, idx) => acc + isC * balls[idx], 0);
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
    const total_ball = Math.floor((50 + z_coficent * 20) * 100) / 100;
    return {
      ...el,
      total_ball,
      skil_calculateMean,
      skil_root,
      degree: getDegree(total_ball),
    };
  });

  new_students.sort((a, b) => b.total_ball - a.total_ball);

  return { new_students, students_count };
}

async function saveResultsToUsers(exam, new_students, responce) {
  let saved_count = 0;

  for (let i = 0; i < new_students.length; i++) {
    const student = new_students[i];
    if (!student.user_id || student.imported) continue;

    const findStudent = await prisma.user.findFirst({
      where: { user_id: student.user_id },
    });
    if (!findStudent) continue;

    const currentTests = Array.isArray(findStudent.tests) ? findStudent.tests : [];

    const studentOriginal = responce.find((r) => r.id === student.user_id);
    const nextTest = {
      id: exam.id,
      user_id: student.user_id,
      score: student.total_ball,
      degree: getDegree(student.total_ball),
      name: exam.name,
      date: new Date().toISOString(),
      test_type: "Rash",
      stdResponce: student.test,
      testResponce: exam.responce,
      responce: studentOriginal,
    };

    const testIndex = currentTests.findIndex((test) => test?.id === exam.id);
    const nextTests =
      testIndex >= 0
        ? currentTests.map((test, index) => (index === testIndex ? nextTest : test))
        : [...currentTests, nextTest];

    await prisma.user.update({
      where: { id: findStudent.id },
      data: { tests: nextTests },
    });

    saved_count++;
  }

  return saved_count;
}

async function sendCertificatesToStudents(exam, new_students) {
  const telegramStudents = new_students.filter((s) => !s.imported);
  const pdfPaths = await generatePDF(exam.name, telegramStudents, exam.responce.length);
  let sent_count = 0;
  const failed_students = [];

  for (const student of telegramStudents) {
    if (!student.user_id) continue;

    const pdfPath = pdfPaths[student.user_id];
    if (!pdfPath) continue;

    try {
      await bot.sendDocument(student.user_id, pdfPath, {
        caption:
          `${exam.name} natijangiz tayyor!\n` +
          `Umumiy ball: ${student.total_ball.toFixed(2)}\n` +
          `Daraja: ${getDegree(student.total_ball)}`,
      });
      sent_count++;
    } catch (err) {
      failed_students.push({
        user_id: student.user_id,
        name: student.name,
        error: err.message,
      });
      console.error("Error sending to user", student.user_id, err.message);
    }
  }

  return { sent_count, failed_students };
}

// GET /rash/:examId — faqat bazadan olib beradi
export const getRashmodule = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await prisma.test.findFirst({ where: { id: Number(examId) } });

    if (!exam) {
      return res.status(404).json({ message: "Exam topilmadi" });
    }

    const rash = getJsonObject(exam.rash);

    if (!rash.new_students) {
      return res.status(404).json({ message: "Rash hali hisoblanmagan" });
    }

    res.status(200).json(rash);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// PATCH /rash/:examId/key — test kalitlarini yangilaydi, agar to'xtatilgan bo'lsa qayta hisoblaydi
export const updateExamKey = async (req, res) => {
  try {
    const { examId } = req.params;
    const { responce } = req.body;

    if (!Array.isArray(responce) || responce.length === 0) {
      return res.status(400).json({ message: "responce to'ldirilgan array bo'lishi kerak" });
    }

    const exam = await prisma.test.findFirst({ where: { id: Number(examId) } });
    if (!exam) {
      return res.status(404).json({ message: "Exam topilmadi" });
    }

    const requesterUserId = req.headers.user_id ?? req.headers["user-id"] ?? req.query.user_id;
    const CEO_USER_ID = "1849659907";
    const isCreator = exam.createdByUserId && exam.createdByUserId === String(requesterUserId);
    const isCeo = String(requesterUserId) === CEO_USER_ID;

    if (exam.createdByUserId && !requesterUserId) {
      return res.status(400).json({ message: "Kalitni o'zgartirish uchun user_id kerak" });
    }
    if (exam.createdByUserId && !isCreator && !isCeo) {
      return res.status(403).json({ message: "Bu testni faqat yaratgan odam yoki CEO o'zgartira oladi" });
    }

    await prisma.test.update({
      where: { id: Number(examId) },
      data: { responce },
    });

    const students = Array.isArray(exam.students) ? exam.students : [];
    const existingRash = getJsonObject(exam.rash);

    // Agar imtihon allaqachon to'xtatilgan bo'lsa — barcha natijalarni qayta hisobla
    if (students.length > 0 && existingRash.new_students) {
      const { new_students, students_count } = calculateRash(students, responce);
      const grade_stats = calcGradeStats(new_students);

      const rashData = {
        ...existingRash,
        students_count,
        grade_stats,
        new_students,
        recalculated_at: new Date().toISOString(),
      };

      await prisma.test.update({
        where: { id: Number(examId) },
        data: { rash: rashData },
      });

      const examForSave = { id: exam.id, name: exam.name, responce };
      const saved_count = await saveResultsToUsers(examForSave, new_students, students);

      return res.json({
        message: "Kalitlar yangilandi va barcha natijalar qayta hisoblandi",
        students_count,
        grade_stats,
        saved_count,
        recalculated_at: rashData.recalculated_at,
      });
    }

    res.json({ message: "Kalitlar yangilandi" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error", error });
  }
};

// GET /rash/stop/:examId — hisoblaydi + bazaga saqlaydi + Telegram yuboradi
export const stopRashmodule = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await prisma.test.findFirst({ where: { id: Number(examId) } });
    if (!exam) {
      return res.status(404).json({ message: "Exam topilmadi" });
    }

    const requesterUserId = req.headers.user_id ?? req.headers["user-id"] ?? req.query.user_id;
    const CEO_USER_ID = "1849659907";
    const isCreator = exam.createdByUserId && exam.createdByUserId === String(requesterUserId);
    const isCeo = String(requesterUserId) === CEO_USER_ID;

    if (exam.createdByUserId && !requesterUserId) {
      return res.status(400).json({ message: "Testni to'xtatish uchun user_id kerak" });
    }

    if (exam.createdByUserId && !isCreator && !isCeo) {
      return res.status(403).json({ message: "Bu testni faqat yaratgan odam yoki CEO to'xtata oladi" });
    }

    if (exam.status === "INACTIVE") {
      return res.status(400).json({ message: "Bu imtihon allaqachon to'xtatilgan" });
    }

    const responce = Array.isArray(exam.students) ? exam.students : [];

    if (responce.length === 0) {
      return res.status(400).json({ message: "Studentlar yo'q" });
    }

    const { new_students, students_count } = calculateRash(responce, exam.responce);
    const grade_stats = calcGradeStats(new_students);

    // Bazaga saqlash
    const saved_count = await saveResultsToUsers(exam, new_students, responce);

    // Telegram sertifikatlar yuborish
    const delivery = await sendCertificatesToStudents(exam, new_students);

    const rashData = {
      students_count,
      grade_stats,
      new_students,
      sent_to_students: true,
      sent_at: new Date().toISOString(),
      delivery: { ...delivery, saved_count },
    };

    await prisma.test.update({
      where: { id: Number(examId) },
      data: {
        rash: rashData,
        status: "INACTIVE",
      },
    });

    res.status(200).json(rashData);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

