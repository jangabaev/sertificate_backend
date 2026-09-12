import prisma from "../lib/prisma.js";
import TelegramBot from "node-telegram-bot-api";
import { generatePDF } from "../utils/generatepdf.js";
import { isCorrect } from "../utils/checkmath.js";
import {
  createJob,
  getJob,
  processCertificateQueue,
} from "../services/certificate.queue.js";

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: false,
});

function getDegree(totalBall) {
  if (totalBall >= 70) return "A+";
  if (totalBall >= 65) return "A";
  if (totalBall >= 60) return "B+";
  if (totalBall >= 55) return "B";
  if (totalBall >= 50) return "C+";
  if (totalBall >= 46) return "C";
  return "NC";
}

function calcGradeStats(students) {
  const stats = { "A+": 0, A: 0, "B+": 0, B: 0, "C+": 0, C: 0, NC: 0 };
  students.forEach((s) => {
    const g = getDegree(s.total_ball);
    stats[g]++;
  });
  return stats;
}

function getJsonObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

const GEOMETRY_INDEXES = [
  22, 24, 25, 26, 27, 28, 29, 32, 33, 34, 45, 46, 47, 48, 49, 50, 51, 52, 53,
  54,
];

const ALGEBRA_INDEXES = Array.from({ length: 55 }, (_, i) => i).filter(
  (i) => !GEOMETRY_INDEXES.includes(i),
);

function calculateSectionRash(students, indexes) {
  const students_count = students.length;

  if (students_count === 0 || indexes.length === 0) {
    return new Map();
  }

  // Faqat shu section savollari bo'yicha to'g'ri javoblar soni
  const currect_answers = new Array(indexes.length).fill(0);

  const sectionStudents = students.map((student) => {
    const test = indexes.map((originalIndex, sectionIndex) => {
      const value = student.test[originalIndex] ?? 0;

      currect_answers[sectionIndex] += value;

      return value;
    });

    return {
      user_id: student.user_id,
      test,
    };
  });

  // Har bir savolning qiyinlik koeffitsienti
  const possiblity = currect_answers.map((correctCount) => {
    const p = correctCount / students_count;

    if (p === 0 || p === 1) {
      return 4 * (1 - p);
    }

    return -Math.log(p / (1 - p));
  });

  const min = Math.min(...possiblity);

  let summa_ball = 0;

  const balls = possiblity.map((poss) => {
    const ball = min * -1 + poss + 1;

    summa_ball += ball;

    return ball;
  });

  // Har bir studentning section bo'yicha currect / incorect / skill
  const sectionResults = sectionStudents.map((student) => {
    let currect = student.test.reduce(
      (acc, isCorrect, index) => acc + isCorrect * balls[index],
      0,
    );

    currect = currect === 0 ? 1 : currect;

    const incorect = summa_ball - currect !== 0 ? summa_ball - currect : 1;

    const skill = Math.log(currect / incorect);

    return {
      user_id: student.user_id,
      currect,
      incorect,
      skill,
    };
  });

  // Mean
  const skil_calculateMean =
    sectionResults.reduce((acc, student) => acc + student.skill, 0) /
    students_count;

  // Root
  const skil_root = Math.sqrt(
    sectionResults.reduce(
      (acc, student) => acc + (student.skill - skil_calculateMean) ** 2,
      0,
    ) / students_count,
  );

  // Final Rash ball
  const results = new Map();

  sectionResults.forEach((student) => {
    const z_coficent =
      skil_root > 0 ? (student.skill - skil_calculateMean) / skil_root : 0;

    let total_ball = Math.floor((50 + z_coficent * 10) * 100) / 100;

    if (total_ball > 87) {
      total_ball = 87 + (total_ball - 87) * 0.07;
    }

    if (total_ball < 25) {
      total_ball = 25 - total_ball * 0.01;
    }

    total_ball = Math.floor(total_ball * 100) / 100;

    if (!isFinite(total_ball) || isNaN(total_ball)) {
      total_ball = 50;
    }

    results.set(student.user_id, {
      total_ball,
    });
  });

  return results;
}

function calculateRash(responce, trueAnswer) {
  const validResponce = responce.filter((el) => {
    return Array.isArray(el.responce) && el.responce.length > 0;
  });

  if (validResponce.length === 0) {
    return {
      new_students: [],
      students_count: 0,
    };
  }

  const students_count = validResponce.length;

  // ============================================================
  // 1. AVVAL barcha studentlarning 55 ta javobini 0/1 ga aylantiramiz
  // ============================================================

  const students = validResponce.map((el) => {
    const testTrueFalse = [];

    el.responce.forEach((ans, index) => {
      if (index >= trueAnswer.length) return;

      let correct;

      if (el.imported) {
        const value = Number(ans);

        if (value !== 0 && value !== 1) {
          console.warn(`Noto'g'ri Excel qiymati: ${ans}`);
          correct = 0;
        } else {
          correct = value;
        }
      } else {
        correct = (
          index > 35
            ? isCorrect(ans, trueAnswer[index])
            : ans?.toLocaleLowerCase() ===
              trueAnswer[index]?.toLocaleLowerCase()
        )
          ? 1
          : 0;
      }

      testTrueFalse.push(correct);
    });

    return {
      user_id: el.id,
      name: el.name,
      test: testTrueFalse,
      imported: el.imported ?? false,
    };
  });

  // ============================================================
  // 2. GEOMETRY va ALGEBRA uchun alohida Rash
  // ============================================================

  const algebraRash = calculateSectionRash(students, ALGEBRA_INDEXES);
  console.log(algebraRash);
  const geometriyaRash = calculateSectionRash(students, GEOMETRY_INDEXES);
  console.log(geometriyaRash);

  // ============================================================
  // 3. Natijalarni studentlarga biriktiramiz
  // ============================================================

  const new_students = students.map((student) => {
    const algebraResult = algebraRash.get(student.user_id);
    const geometryResult = geometriyaRash.get(student.user_id);

    // Algebra 35 ta savolning ulushi
    const algebra = ((algebraResult?.total_ball ?? 50) * 35) / 55;

    // Geometry 20 ta savolning ulushi
    const geometriya = ((geometryResult?.total_ball ?? 50) * 20) / 55;

    // Umumiy ball
    const total_ball = algebra + geometriya;

    return {
      ...student,

      // faqat final weighted ball
      algebra: Math.floor(algebra * 100) / 100,
      geometriya: Math.floor(geometriya * 100) / 100,

      total_ball: Math.floor(total_ball * 100) / 100,

      degree: getDegree(total_ball),
    };
  });

  // Umumiy ball bo'yicha sort
  new_students.sort((a, b) => b.total_ball - a.total_ball);

  return {
    new_students,
    students_count,
  };
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

    const currentTests = Array.isArray(findStudent.tests)
      ? findStudent.tests
      : [];

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
        ? currentTests.map((test, index) =>
            index === testIndex ? nextTest : test,
          )
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
  const telegramStudents = new_students.filter((s) => !s.imported && s.user_id);

  if (telegramStudents.length === 0) {
    return {
      message: "Telegram studentlar topilmadi",
      total: 0,
    };
  }

  // 1. PDF'larni bir marta generate qilamiz
  const pdfPaths = await generatePDF(
    exam.name,
    telegramStudents,
    exam.responce.length,
  );

  // 2. Job yaratamiz
  const job = createJob(exam.id, telegramStudents);

  // 3. Background'da yuborishni boshlaymiz
  processCertificateQueue({
    exam,
    students: telegramStudents,
    pdfPaths,
    bot,
    getDegree,
  }).catch((error) => {
    console.error("Certificate queue fatal error:", error);

    const currentJob = getJob(exam.id);

    if (currentJob) {
      currentJob.status = "failed";
      currentJob.finished_at = new Date().toISOString();
      currentJob.error = error.message;
    }
  });

  // Muhim:
  // Bu yerda await qilmaymiz!
  return {
    message: "Sertifikat yuborish boshlandi",
    examId: exam.id,
    total: telegramStudents.length,
    job_status: job.status,
  };
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
      return res
        .status(400)
        .json({ message: "responce to'ldirilgan array bo'lishi kerak" });
    }

    const exam = await prisma.test.findFirst({ where: { id: Number(examId) } });
    if (!exam) {
      return res.status(404).json({ message: "Exam topilmadi" });
    }

    const requesterUserId =
      req.headers.user_id ?? req.headers["user-id"] ?? req.query.user_id;
    const CEO_USER_ID = "1849659907";
    const isCreator =
      exam.createdByUserId && exam.createdByUserId === String(requesterUserId);
    const isCeo = String(requesterUserId) === CEO_USER_ID;

    if (exam.createdByUserId && !requesterUserId) {
      return res
        .status(400)
        .json({ message: "Kalitni o'zgartirish uchun user_id kerak" });
    }
    if (exam.createdByUserId && !isCreator && !isCeo) {
      return res.status(403).json({
        message: "Bu testni faqat yaratgan odam yoki CEO o'zgartira oladi",
      });
    }

    await prisma.test.update({
      where: { id: Number(examId) },
      data: { responce },
    });

    const students = Array.isArray(exam.students) ? exam.students : [];
    const existingRash = getJsonObject(exam.rash);

    // Agar imtihon allaqachon to'xtatilgan bo'lsa — barcha natijalarni qayta hisobla
    if (students.length > 0 && existingRash.new_students) {
      const { new_students, students_count } = calculateRash(
        students,
        responce,
      );

      if (students_count === 0) {
        return res.status(400).json({
          message: "Hech bir studentning javobi to'g'ri formatda emas",
        });
      }

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
      const saved_count = await saveResultsToUsers(
        examForSave,
        new_students,
        students,
      );

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
    console.log(exam.name);
    const requesterUserId =
      req.headers.user_id ?? req.headers["user-id"] ?? req.query.user_id;
    const CEO_USER_ID = "1849659907";

    console.log("=== POST EXAM ===");
    console.log("examId:", examId);
    console.log("requesterUserId:", requesterUserId);
    // console.log(exam);
    const isCreator =
      exam.createdByUserId && exam.createdByUserId === String(requesterUserId);
    const isCeo = String(requesterUserId) === CEO_USER_ID;

    console.log(isCreator);

    if (exam.createdByUserId && !requesterUserId) {
      console.log("1");
      return res
        .status(400)
        .json({ message: "Testni to'xtatish uchun user_id kerak" });
    }

    if (exam.createdByUserId && !isCreator && !isCeo) {
      console.log("2");
      return res.status(403).json({
        message: "Bu testni faqat yaratgan odam yoki CEO to'xtata oladi",
      });
    }

    if (exam.status === "INACTIVE") {
      return res
        .status(400)
        .json({ message: "Bu imtihon allaqachon to'xtatilgan" });
    }

    const responce = Array.isArray(exam.students) ? exam.students : [];

    if (responce.length === 0) {
      return res.status(400).json({ message: "Studentlar yo'q" });
    }

    const { new_students, students_count } = calculateRash(
      responce,
      exam.responce,
    );

    if (students_count === 0) {
      return res
        .status(400)
        .json({ message: "Hech bir studentning javobi to'g'ri formatda emas" });
    }

    const grade_stats = calcGradeStats(new_students);

    // Bazaga saqlash
    const saved_count = await saveResultsToUsers(exam, new_students, responce);

    // Telegram sertifikatlar yuborish

    //comment now for stopped seng exam
    // const delivery = await sendCertificatesToStudents(exam, new_students);

    console.log(exam);
    // console.log(new_students);

    const rashData = {
      students_count,
      grade_stats,
      new_students,
      sent_to_students: true,
      sent_at: new Date().toISOString(),
      // delivery: { ...delivery, saved_count },
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

export const sendSertificateAndMessage = async (req, res) => {
  try {
    const { examId } = req.params;

    console.log("examId=", examId);

    const exam = await prisma.test.findFirst({
      where: {
        id: Number(examId),
      },
    });

    console.log("name=", exam.name);

    if (!exam || !exam.rash?.new_students) {
      return res.status(404).json({
        message: "Exam topilmadi",
      });
    }

    const existingJob = getJob(exam.id);

    // Agar allaqachon yuborilayotgan bo'lsa
    if (existingJob?.status === "processing") {
      return res.status(409).json({
        message: "Sertifikatlar hozir yuborilmoqda",
        job: existingJob,
      });
    }

    const result = await sendCertificatesToStudents(
      exam,
      exam.rash.new_students,
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("sendSertificateAndMessage error:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
