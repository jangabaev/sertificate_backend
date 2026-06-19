import { Prisma } from "@prisma/client";

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
    const { name, status, responce } = req.body

    const exam = await prisma.test.create({
      data: {
        name,
        status,
        responce
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
    const user = await prisma.user.findFirst({
      where: { user_id }
    })

    const currentStudents = Array.isArray(exam.students) ? exam.students : [];
    const newStudent = {
      id: user.user_id,
      name: user.first_name ?? "" + user.last_name ?? "",
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
    res.status(501).json({
      message: "Error getting exams"
    })
  }
}