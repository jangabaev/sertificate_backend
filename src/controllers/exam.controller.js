import { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";

import prisma from "../lib/prisma.js";

export const getExams = async (req, res) => {
  try {
    const { sort_by } = req.query;

    const statusMap = { active: "ACTIVE", noactive: "INACTIVE" };
    const where = statusMap[sort_by] ? { status: statusMap[sort_by] } : {};

    const exams = await prisma.test.findMany({
      where,
      orderBy: { id: "asc" },
    });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: "Error getting exams" });
  }
}

export const postExam = async (req, res) => {
  try {
    const { name, status, responce, user_id } = req.body

    const creatorId = user_id ?? req.headers.user_id ?? req.headers["user-id"];

    if (!creatorId) {
      return res.status(400).json({ message: "Test yaratish uchun user_id kerak" });
    }

    const exam = await prisma.test.create({
      data: {
        name,
        status,
        responce,
        createdByUserId: String(creatorId),
      }
    })

    res.status(201).json(exam)
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: "Error creating user"
    })
  }
}

export const studentResponce = async (req, res) => {
  try {
    const { id } = req.params
    const { user_id, responce } = req.body
    const exam = await prisma.test.findFirst({
      where: { id: Number(id) }
    });

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (exam.status === "INACTIVE") {
      return res.status(400).json({ message: "Bu imtihon allaqachon yakunlangan" });
    }

    const user = await prisma.user.findFirst({
      where: { user_id: String(user_id) }
    });

    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }

    const currentStudents = Array.isArray(exam.students) ? exam.students : [];

    const alreadySubmitted = currentStudents.some(s => s.id === user.user_id);
    if (alreadySubmitted) {
      return res.status(409).json({ message: "Bu o'quvchi allaqachon javob yuborgan" });
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
        students: currentStudents
      }
    });
    res.json(updatedExam)
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: "Error getting users"
    })
  }
}

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
      return res.status(400).json({ message: "Bu imtihon allaqachon yakunlangan" });
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
      where: { id: Number(id) },
      data: { students: [...currentStudents, ...newEntries] },
    });

    res.status(201).json({ message: `${newEntries.length} ta student qo'shildi`, added: newEntries.length });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Import xatosi" });
  }
};

export const exportExamExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await prisma.test.findFirst({ where: { id: Number(id) } });

    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const correctAnswers = Array.isArray(exam.responce) ? exam.responce : [];
    const students = Array.isArray(exam.students) ? exam.students : [];
    const questionCount = correctAnswers.length;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Natijalar");

    // Header row
    sheet.columns = [
      { header: "Ism Familya", key: "name", width: 25 },
      ...correctAnswers.map((_, i) => ({ header: String(i + 1), key: `q${i}`, width: 5 })),
      { header: "Jami", key: "total", width: 8 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: "center" };

    for (const student of students) {
      const answers = Array.isArray(student.responce) ? student.responce : [];
      const scores = correctAnswers.map((correct, i) => (answers[i] === correct ? 1 : 0));
      const total = scores.reduce((a, b) => a + b, 0);

      const row = { name: student.name };
      scores.forEach((s, i) => { row[`q${i}`] = s; });
      row.total = total;
      sheet.addRow(row);
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=exam_${id}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Excel yaratishda xato" });
  }
};

export const getExam = async (req, res) => {
  try {
    const { id } = req.params
    const data = await prisma.test.findFirst({
      where: {
        id: Number(id)
      }
    })
    res.json(data)
  } catch (error) {
    res.status(500).json({
      message: "Error getting exams"
    })
  }
}
