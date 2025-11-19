import { Test } from "../models/test.model.js";
import { Exam } from "../models/exam.model.js";
import { User } from "../models/user.model.js";
import TelegramBot from "node-telegram-bot-api";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const bot = new TelegramBot("8300584993:AAE4MCh5CbNwUWsKI6g534r47oAPVa_N3qo", {
  polling: false,
});

import { generatePDF } from "../utils/generatepdf.js";

export const getRashmodule = async (req, res) => {
  try {
    const { examId } = req.params;

    let respon = await Exam.findById(examId);
    if (!res) {
      return res.status(400).json([]);
    }
    let responce = respon.tests;
    let students_count = responce.length;
    const trueAnswer = respon.currect_answer;
    let new_students = [];
    let currect_answers = new Array(trueAnswer.length).fill(0);
    responce.map((el) => {
      const testTrueFalse = [];
      el.test.map((res, index) => {
        currect_answers[index] =
          currect_answers[index] +
          (res?.toLocaleLowerCase() === trueAnswer[index].toLocaleLowerCase()
            ? 1
            : 0);
        testTrueFalse.push(
          res?.toLocaleLowerCase() === trueAnswer[index].toLocaleLowerCase()
            ? 1
            : 0
        );
      });
      new_students.push({
        user_id: el.user_id,
        name: el.name,
        test: testTrueFalse,
      });
    });

    let possiblity = [];

    currect_answers.map((el) => {
      let p = el / students_count;
      let b = 0;
      if (p == 0 || p == 1) {
        b = 4 * (1 - p);
      } else {
        b = p = 0 ? 10 : -Math.log(p / (1 - p));
      }
      possiblity.push(b);
    });

    const min = Math.min(...possiblity);
    let balls = [];
    let summa_ball = 0;
    possiblity.map((poss) => {
      balls.push(min * -1 + poss + 1);
      summa_ball += min * -1 + poss + 1;
    });
    let skills_array = [];
    new_students = new_students.map((el) => {
      let currect = 0;
      el.test.map((test, idx) => {
        currect += test ?? 0 * balls[idx];
      });
      currect = currect === 0 ? 1 : currect;
      let incorect = summa_ball - currect !== 0 ? summa_ball - currect : 1;
      let skill = Math.log(
        (currect === 0 || !currect ? 1 : currect) / incorect
      );
      skills_array.push(Math.log((currect ?? 1) / incorect));
      return { ...el, incorect, currect: currect ?? 1, skill };
    });

    const skil_calculateMean =
      skills_array.reduce((acc, value) => acc + value, 0) / students_count;
    const skil_root = Math.sqrt(
      skills_array.reduce((acc, value) => {
        acc + value ** 2;
        return acc + value ** 2;
      }, 0) / students_count
    );

    new_students = new_students.map((el) => {
      let z_coficent = (el.skill - skil_calculateMean) / skil_root;
      let total_ball = 50 + z_coficent * 20;
      return { ...el, total_ball, skil_calculateMean, skil_root };
    });

    res.status(200).json({ students_count, new_students, name: respon.name });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const stopRashmodule = async (req, res) => {
  try {
    const { examId } = req.params;
    let respon = await Exam.findById(examId);
    if (!res) {
      return res.status(400).json([]);
    }
    let responce = respon.tests;
    let students_count = responce.length;
    const trueAnswer = respon.currect_answer;
    let new_students = [];
    let currect_answers = new Array(trueAnswer.length).fill(0);
    responce.map((el) => {
      const testTrueFalse = [];
      el.test.map((res, index) => {
        currect_answers[index] =
          currect_answers[index] +
          (res.toLocaleLowerCase() === trueAnswer[index].toLocaleLowerCase()
            ? 1
            : 0);
        testTrueFalse.push(
          res.toLocaleLowerCase() === trueAnswer[index].toLocaleLowerCase()
            ? 1
            : 0
        );
      });
      new_students.push({
        user_id: el.user_id,
        name: el.name,
        test: testTrueFalse,
      });
    });

    let possiblity = [];

    currect_answers.map((el) => {
      let p = el / students_count;
      let b = 0;
      if (p == 0 || p == 1) {
        b = 4 * (1 - p);
      } else {
        b = -Math.log(p / (1 - p));
      }
      possiblity.push(b);
    });

    const min = Math.min(...possiblity);
    let balls = [];
    let summa_ball = 0;
    possiblity.map((poss) => {
      balls.push(min * -1 + poss + 1);
      summa_ball += min * -1 + poss + 1;
    });

    let skills_array = [];

    new_students = new_students.map((el) => {
      let currect = 0;
      el.test.map((test, idx) => {
        currect += test * balls[idx];
      });
      let incorect = summa_ball - currect !== 0 ? summa_ball - currect : 1;
      let skill = Math.log((currect ?? 1) / incorect);
      skills_array.push(Math.log((currect ?? 1) / incorect));
      return { ...el, incorect, currect, skill };
    });

    const skil_calculateMean =
      skills_array.reduce((acc, value) => acc + value, 0) / students_count;
    const skil_root = Math.sqrt(
      skills_array.reduce((acc, value) => acc + value ** 2, 0) / students_count
    );

    new_students = new_students.map((el) => {
      let z_coficent = (el.skill - skil_calculateMean) / skil_root;
      let total_ball = 50 + z_coficent * 20;
      return { ...el, total_ball, skil_calculateMean, skil_root };
    });

    const pdfFolder = generatePDF(respon.name, new_students);

    for (const student of new_students) {
      if (student.user_id) {
        const pdfPath = `${pdfFolder}/${student.name.replace(/\s+/g, "_")}.pdf`;
        const findStudent = await User.findOne({ user_id: student.user_id });
        if (!findStudent) continue;
        findStudent.tests.push({
          id: respon._id,
          score: student.total_ball,
          degree: "A+",
          name: respon.name,
          date: "",
          test_type: "Rash",
        });
        await findStudent.save();
        try {
          await bot.sendDocument(student.user_id, pdfPath, {
            caption: `📄 ${
              respon.name
            } natijalari tayyor!\nUmumiy ball: ${student.total_ball.toFixed(
              2
            )}`,
          });
        } catch (err) {
          console.error("Error sending to user", student.user_id, err.message);
        }
      }
    }

    // respon.status = "completed";
    // await respon.save();

    res.status(200).json({ students_count, new_students, name: respon.name });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
