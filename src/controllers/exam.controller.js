import ExcelJS from "exceljs";
import multer from "multer";
import TelegramBot from "node-telegram-bot-api";
import prisma from "../lib/prisma.js";
import { isCorrect } from "../utils/checkmath.js";
import { deshifr } from "../utils/dechifr.js";

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: false,
});
export const upload = multer({ storage: multer.memoryStorage() });

export const getExams = async (req, res) => {
  try {
    const { sort_by } = req.query;
    const header = req.headers.token;

    if (!header) {
      if (!sort_by) {
        const exams = await prisma.test.findMany({
          orderBy: {
            id: "desc",
          },
        });

        return res.status(200).json(exams);
      }

      let where = {};

      if (sort_by === "active") {
        where = {
          status: {
            in: ["ACTIVE", "PENDING"],
          },
        };
      }

      if (sort_by === "noactive") {
        where = {
          status: "INACTIVE",
        };
      }

      const exams = await prisma.test.findMany({
        where,
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          type: true,
          price: true,
          channelId: true,
          students: true,
        },
        orderBy: {
          id: "desc",
        },
      });
      const result = exams.map((exam) => {
        const { students, ...rest } = exam;

        return {
          ...rest,
          studentCount: Array.isArray(students) ? students.length : 0,
          isMemberSubmid: false,
        };
      });

      return res.status(200).json(result);
    }

    const user_id = deshifr(header);
    let where = {};

    if (sort_by === "active") {
      where = {
        status: {
          in: ["ACTIVE", "PENDING"],
        },
      };
    }

    if (sort_by === "noactive") {
      where = {
        status: "INACTIVE",
      };
    }

    const exams = await prisma.test.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        type: true,
        price: true,
        channelId: true,
        students: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    const result = exams.map((exam) => {
      const { students, ...rest } = exam;

      const isMemberSubmid = user_id
        ? Array.isArray(students) &&
          students.some((student) => String(student.id) === String(user_id))
        : false;

      return {
        ...rest,
        studentCount: Array.isArray(students) ? students.length : 0,
        isMemberSubmid,
      };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get exams error:", error);

    return res.status(500).json({
      message: "Error getting exams",
    });
  }
};

export const getTestPending = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(id);

    const exam = await prisma.test.update({
      where: {
        id: Number(id), // agar Prisma'da id Int bo'lsa
      },
      data: {
        status: "PENDING",
      },
    });

    console.log(exam);

    return res.status(200).json(exam);
  } catch (error) {
    console.error("Exam update error:", error);

    return res.status(500).json({
      message: "Testni yangilashda xatolik yuz berdi",
    });
  }
};

export const checkChannelMember = async (req, res) => {
  try {
    const { channelId, userId } = req.body;

    console.log("channelId =", channelId);
    console.log("userId =", userId);

    if (!channelId || !userId) {
      return res.status(400).json({
        success: false,
        isMember: false,
        message: "channelId yoki userId yuborilmagan",
      });
    }

    const CHANNELS = [
      channelId, // asosiy kanal
      "-1003722907958", // ms3
      "-1003923825017", // ms4
      "-1003968513581", // ms5
      "-1003722907958",
      "-1003968513581",
    ];

    const results = await Promise.allSettled(
      CHANNELS.map((id) => bot.getChatMember(id, userId)),
    );

    const MEMBER_STATUSES = [
      "creator",
      "administrator",
      "member",
      "restricted",
    ];

    const checkedChannels = results.map((result, index) => {
      if (result.status === "fulfilled") {
        const member = result.value;

        return {
          channelId: CHANNELS[index],
          status: member.status,
          isMember: MEMBER_STATUSES.includes(member.status),
        };
      }

      console.error(
        `Channel ${CHANNELS[index]} tekshirishda xato:`,
        result.reason,
      );

      return {
        channelId: CHANNELS[index],
        status: "error",
        isMember: false,
      };
    });

    // 4 ta kanaldan bittasida bo'lsa ham true
    const isMember = checkedChannels.some(
      (channel) => channel.isMember === true,
    );

    return res.status(200).json({
      success: true,
      isMember,
      channels: checkedChannels,
    });
  } catch (error) {
    console.error("checkChannelMember error:", error);

    return res.status(500).json({
      success: false,
      isMember: false,
      message: "Kanal a'zoligini tekshirishda xatolik",
    });
  }
};

export const postExam = async (req, res) => {
  try {
    const { name, status, responce, user_id, type, price, channelId } =
      req.body;
    const creatorId = user_id ?? req.headers.user_id ?? req.headers["user-id"];

    if (!creatorId) {
      return res
        .status(400)
        .json({ message: "Test yaratish uchun user_id kerak" });
    }

    const exam = await prisma.test.create({
      data: {
        name,
        status,
        responce,
        createdByUserId: String(creatorId) ?? "1849659907",
        type,
        price,
        channelId,
      },
    });

    res.status(201).json(exam);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error creating user",
    });
  }
};

export const buyTest = async (req, res) => {
  try {
    const { id } = req.body;
    const header = req.headers.token;
    const user_id = deshifr(header);
    if (!user_id) {
      return res
        .status(400)
        .json({ message: "Test yaratish uchun header kerak" });
    }

    const user = await prisma.user.findFirst({
      where: { user_id },
    });

    if (!user) {
      return res.status(400).json({ message: "Do not found user" });
    }

    const test = await prisma.test.findFirst({
      where: { id: Number(id) },
    });

    if (!test) {
      return res.status(400).json({ message: "Don not found exam" });
    }

    if (test.price > user.balance) {
      return res.status(401).json({ message: "user don't have enough money" });
    }

    const userUpdate = await prisma.user.update({
      where: {
        user_id,
      },
      data: {
        balance: user.balance - test.price,
      },
    });

    const responce = await prisma.test.update({
      where: { id: Number(id) },
      data: {
        userTest: [...test.userTest, user_id],
      },
    });

    res.status(201).json(responce);
  } catch (error) {
    return res.status(400).json({ message: "Hatolik yuz berdi" });
  }
};

export const studentResponce = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, responce } = req.body;

    const exam = await prisma.test.findFirst({
      where: { id: Number(id) },
    });

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.status === "PENDING") {
      return res.status(400).json({ message: "Bu imtihon Vati Tugagan" });
    }

    if (exam.status === "INACTIVE") {
      return res
        .status(400)
        .json({ message: "Bu imtihon allaqachon yakunlangan" });
    }

    const user = await prisma.user.findFirst({
      where: { user_id: String(user_id) },
    });

    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }

    // if (!exam.userTest.includes(String(user_id)) && exam.type === "PREMIUM") {
    //   return res.status(400).json({
    //     message: "Hatolik balance etarli emas",
    //   });
    // }

    const currentStudents = Array.isArray(exam.students) ? exam.students : [];

    const alreadySubmitted = currentStudents.some((s) => s.id === user.user_id);
    if (alreadySubmitted) {
      return res
        .status(409)
        .json({ message: "Bu o'quvchi allaqachon javob yuborgan" });
    }

    const newStudent = {
      id: user.user_id,
      name: (user.first_name ?? "") + " " + (user.last_name ?? ""),
      nickname: user.username,
      responce,
    };
    currentStudents.push(newStudent);

    const updatedExam = await prisma.test.update({
      where: { id: Number(id) },
      data: {
        students: currentStudents,
      },
    });
    res.json(updatedExam);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error getting users",
    });
  }
};

export const importStudents = async (req, res) => {
  try {
    const { id } = req.params;
    // students: [{name: "Ali Valiyev", responce: ["a","b","c",...]}]
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: "students array bo'lishi kerak" });
    }

    const exam = await prisma.test.findFirst({ where: { id: Number(id) } });
    if (!exam) return res.status(404).json({ message: "Exam topilmadi" });

    if (exam.status === "INACTIVE") {
      return res
        .status(400)
        .json({ message: "Bu imtihon allaqachon yakunlangan" });
    }

    const currentStudents = Array.isArray(exam.students) ? exam.students : [];

    const newEntries = students.map((s, i) => {
      return {
        id: `import_${Date.now()}_${i}`,
        name: s.name,
        nickname: s.name,
        responce: s.responce,
        imported: true,
      };
    });

    await prisma.test.update({
      where: { id: Number(id) },
      data: { students: [...currentStudents, ...newEntries] },
    });

    res.status(201).json({
      message: `${newEntries.length} ta student qo'shildi`,
      added: newEntries.length,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Import xatosi" });
  }
};

export const exportExamExcel = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await prisma.test.findFirst({
      where: { id: Number(id) },
    });

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const correctAnswers = Array.isArray(exam.responce) ? exam.responce : [];

    const students = Array.isArray(exam.students) ? exam.students : [];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Natijalar");

    // =========================
    // HEADER
    // =========================
    sheet.columns = [
      {
        header: "Ism Familya",
        key: "name",
        width: 25,
      },

      ...correctAnswers.map((_, i) => ({
        header: String(i + 1),
        key: `q${i}`,
        width: 8,
      })),

      {
        header: "Jami",
        key: "total",
        width: 8,
      },
    ];

    sheet.getRow(1).font = {
      bold: true,
    };

    sheet.getRow(1).alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    // =========================
    // STUDENTS
    // =========================
    for (const student of students) {
      const answers = Array.isArray(student.responce) ? student.responce : [];

      /*
        Telegram user:
        user_id: "1849659907"

        Import user:
        user_id: "import:test1.xlsx:1723456789"
      */

      const userId = String(student.user_id ?? "");

      const isImported = userId.startsWith("import:");

      let scores = [];

      // =========================
      // IMPORT QILINGAN STUDENT
      // =========================
      if (isImported) {
        /*
          Import qilingan student responce:

          [1, 0, 1, 1, 0]

          1 = to'g'ri
          0 = xato
        */

        scores = correctAnswers.map((_, i) => {
          return Number(answers[i]) === 1 ? 1 : 0;
        });
      }

      // =========================
      // TELEGRAM STUDENT
      // =========================
      else {
        scores = correctAnswers.map((correct, i) => {
          const answer = answers[i];

          if (answer === undefined || answer === null) {
            return 0;
          }

          let isRight = false;

          // 36-savoldan keyin matematik javoblarni
          // isCorrect orqali tekshirish
          if (i > 35) {
            isRight = isCorrect(answer, correct);
          } else {
            // Oddiy text javob
            isRight =
              String(answer).trim().toLocaleLowerCase() ===
              String(correct).trim().toLocaleLowerCase();
          }

          return isRight ? 1 : 0;
        });
      }

      // =========================
      // JAMI BALL
      // =========================
      const total = scores.reduce((sum, score) => sum + score, 0);

      const row = {
        name: student.name ?? "",
        total,
      };

      scores.forEach((score, i) => {
        row[`q${i}`] = score === 1 ? "to'g'ri" : "xato";
      });

      sheet.addRow(row);
    }

    // =========================
    // EXCEL RESPONSE
    // =========================
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=exam_${id}.xlsx`,
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    console.error("exportExamExcel error:", error);

    return res.status(500).json({
      message: "Excel yaratishda xato",
    });
  }
};

export const getExam = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.test.findFirst({
      where: {
        id: Number(id),
      },
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Error getting exams",
    });
  }
};

export const importExamExcel = async (req, res) => {
  try {
    const test_id = req.body.test_id;
    const user_id = req.body.user_id;
    if (!req.file) {
      return res.status(400).json({ message: "Excel fayl yuborilmadi" });
    }
    if (!test_id) {
      return res.status(400).json({ message: "test_id yuborilmadi" });
    }

    const exam = await prisma.test.findFirst({
      where: { id: Number(test_id) },
    });
    if (!exam) return res.status(404).json({ message: "Exam topilmadi" });

    if (exam.status === "INACTIVE") {
      return res
        .status(400)
        .json({ message: "Bu imtihon allaqachon yakunlangan" });
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    const headerRow = sheet.getRow(1).values.slice(1);
    // Faqat raqamli ustunlarni sanash (1, 2, 3 ...) — "Jami", "Ball", "Daraja" va boshqalarni e'tiborsiz qoldirish
    const questionCount = headerRow.filter((h) => Number(h) >= 1).length;

    const students = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cells = row.values.slice(1);
      const name = cells[0];
      if (!name) return;

      const responce = [];
      for (let i = 1; i <= questionCount; i++) {
        const cell = cells[i];
        const val = typeof cell === "string" ? cell.trim() : String(cell ?? "");
        responce.push(val === "to'g'ri" || val === "1" ? 1 : 0);
      }
      students.push({ name: String(name), responce });
    });

    if (students.length === 0) {
      return res.status(400).json({ message: "Excelda talabalar topilmadi" });
    }

    const currentStudents = Array.isArray(exam.students) ? exam.students : [];
    const newEntries = students.map((s, i) => ({
      id: `import_${Date.now()}_${i}`,
      name: s.name,
      nickname: s.name,
      responce: s.responce,
      imported: true,
    }));

    await prisma.test.update({
      where: { id: Number(test_id) },
      data: { students: [...currentStudents, ...newEntries] },
    });

    res.status(201).json({
      message: `${newEntries.length} ta student qo'shildi`,
      added: newEntries.length,
      test_id: Number(test_id),
      uploaded_by: user_id ?? null,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Excel import xatosi" });
  }
};

export const patchChangeAnswers = async (req, res) => {
  try {
    const { id } = req.params;

    const { name, status, responce, type, price, channelId } = req.body;

    const exam = await prisma.test.update({
      where: {
        id: Number(id), // agar Prisma'da id Int bo'lsa
      },
      data: {
        ...(name !== undefined && { name }),
        ...(status !== undefined && { status }),
        ...(responce !== undefined && { responce }),
        ...(type !== undefined && { type }),
        ...(price !== undefined && { price }),
        ...(channelId !== undefined && { channelId }),
      },
    });

    return res.status(200).json(exam);
  } catch (error) {
    console.error("Exam update error:", error);

    return res.status(500).json({
      message: "Testni yangilashda xatolik yuz berdi",
    });
  }
};

export const deleteExam = async (req, res) => {
  try {
    const { examId } = req.params;

    const token = req.headers.token;

    if (!token) {
      return res.status(401).json({
        message: "Token topilmadi",
      });
    }

    const requesterUserId = deshifr(token);

    if (!requesterUserId) {
      return res.status(401).json({
        message: "Token noto'g'ri",
      });
    }

    const exam = await prisma.test.findUnique({
      where: {
        id: Number(examId),
      },
    });

    if (!exam) {
      return res.status(404).json({
        message: "Test topilmadi",
      });
    }

    const CEO_USER_ID = process.env.CEO_USER_ID;

    const isCreator = String(exam.createdByUserId) === String(requesterUserId);

    const isCeo = String(requesterUserId) === String(CEO_USER_ID);

    if (!isCreator && !isCeo) {
      return res.status(403).json({
        message: "Bu testni o'chirishga ruxsatingiz yo'q",
      });
    }

    await prisma.test.delete({
      where: {
        id: Number(examId),
      },
    });

    return res.status(200).json({
      message: "Test muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    console.error("DELETE EXAM ERROR:", error);

    return res.status(500).json({
      message: "Testni o'chirishda xatolik",
    });
  }
};
