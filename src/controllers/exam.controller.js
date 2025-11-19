import { Exam } from "../models/exam.model.js";

export const postExam = async (req, res) => {
  try {
    const { name, currect_answer, test_type } = req.body;

    if (!name || !currect_answer) {
      return res
        .status(400)
        .json({ message: "Name and correct answers are required" });
    }
    const newExam = new Exam({
      name,
      currect_answer,
      status: "active",
      test_type,
    });
    await newExam.save();
    res.status(201).json(newExam);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getExam = async (req, res) => {
  try {
    const exams = await Exam.find();
    res.status(200).json(
      exams.map((exam) => ({
        id: exam._id,
        name: exam.name,
        status: exam.status ?? "notknown",
        test_type: exam.test_type ?? "standard",
      }))
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const addTestToExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { user_id, test, name } = req.body;
    // Exam topamiz
    const exam = await Exam.findById(examId);
    if (!exam || !user_id || !test || !name) {
      return res.status(404).json({ message: "111Exam not found" });
    }
    if (test.length !== exam.currect_answer.length) {
      return res
        .status(400)
        .json({ message: "Test answers length mismatch for rash test type" });
    }
    if (user_id && exam.tests.find((t) => t.user_id === user_id)) {
      return res
        .status(400)
        .json({ message: "User has already submitted a test for this exam" });
    }
    exam.tests.push({ user_id, test, name });
    await exam.save();
    res.status(200).json({
      message: "New test added successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const oneExamDetails = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }
    res.status(200).json({ name: exam.name, id: exam._id, ...exam });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

export const chageExamStatus = async (req, res) => {
  try {
    const { examId } = req.params;
    const { status } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }
    exam.status = status;
    await exam.save();
    res.status(200).json({ message: "Exam status updated", exam });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getExamActiveStatus = async (req, res) => {
  try {
    const exams = await Exam.find();
    res.status(200).json(
      exams.filter((exam) => {
        if (exam.status === "active") {
          return {
            id: exam._id,
            name: exam.name,
            status: exam.status ?? "notknown",
          };
        }
      })
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
