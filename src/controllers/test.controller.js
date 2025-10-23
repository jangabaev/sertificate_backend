import { Test } from "../models/test.model.js";

export const trueAnswer = ["a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a", "a"]
export const checkTest = async (req, res) => {
  try {
    const { name, id, test } = req.body;
    if (!name && !test && !id) {
      return res.status(400).json({ message: "No answers provided" });
    }
    if (test.length !== 35) {
      return res.status(400).json({ message: "No answers provided" });
    }
    let counter = 0;
    test.map((el, indx) => {
      if (el === trueAnswer[indx]) {
        counter += 1;
      }
    })

    const exam = await Test.create({
      user_id: id,
      test,
      score: counter,
      name
    });

    res.status(201).json({
      message: "exam created successfully",
      user: {
        score: exam.score
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getTests = async (req, res) => {
  try {
    const tests = await Test.find();
    res.status(200).json(tests);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
}