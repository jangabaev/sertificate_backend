import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { deshifr } from "../utils/dechifr.js";

export const createUser = async (req, res) => {
  try {
    const { user_id, username, first_name, last_name, role } = req.body;

    const strUserId = String(user_id);

    const existing = await prisma.user.findFirst({
      where: { user_id: strUserId },
    });

    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = await prisma.user.create({
      data: {
        user_id: strUserId,
        username: username || null,
        first_name: first_name || null,
        last_name: last_name || null,
        balance: 0,
        role: role ?? "MEMBER",
        info: {},
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error creating user",
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: "Error getting users",
    });
  }
};

export const getUserbyId = async (req, res) => {
  try {
    const header = req.headers.token;

    if (!header) {
      return res.status(400).json({
        message: "No token provided",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        user_id: String(header),
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const tests = Array.isArray(user.tests) ? user.tests : [];

    // Test umuman bo'lmasa
    if (tests.length === 0) {
      return res.json({
        ...user,
        statistics: {
          overall_average: 0,
          questions: [],
        },
      });
    }

    const scores = tests
      .map((test) => Number(test?.score))
      .filter((score) => Number.isFinite(score));

    const overallAverage =
      scores.length > 0
        ? Number(
            (
              scores.reduce((sum, score) => sum + score, 0) / scores.length
            ).toFixed(2),
          )
        : 0;

    const questionStats = [];

    for (let i = 0; i < 55; i++) {
      let answeredTests = 0;
      let correctAnswers = 0;

      for (const test of tests) {
        const stdResponce = Array.isArray(test?.stdResponce)
          ? test.stdResponce
          : [];

        if (i >= stdResponce.length) {
          continue;
        }

        const answer = stdResponce[i];

        if (answer === 0 || answer === 1) {
          answeredTests++;

          if (answer === 1) {
            correctAnswers++;
          }
        }
      }

      const correctPercent =
        answeredTests > 0
          ? Number(((correctAnswers / answeredTests) * 100).toFixed(2))
          : 0;

      questionStats.push({
        question: i + 1,
        correct_percent: correctPercent,
        correct: correctAnswers,
        total: answeredTests,
      });
    }

    res.json({
      ...user,

      statistics: {
        overall_average: overallAverage,
        questions: questionStats,
      },
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Error getting user",
    });
  }
};

export const upBalance = async (req, res) => {
  try {
    const token = req.headers.token;
    const { amount } = req.body;

    if (!token) {
      return res.status(400).json({ message: "No token provided" });
    }

    let userId = deshifr(token);

    const responce = await prisma.user.findFirst({
      where: {
        user_id: String(userId),
      },
    });

    if (!responce) {
      return res.status(400).json({ message: "No token provided" });
    }

    const responceUser = await prisma.user.update({
      where: {
        user_id: String(userId),
      },
      data: {
        balance: Number(responce.balance) + Number(amount),
      },
    });

    return res.json(responceUser);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Error getting users",
    });
  }
};
