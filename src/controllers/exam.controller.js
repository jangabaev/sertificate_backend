import { Exam } from "../models/exam.model.js";

export const postExam= async (req,res)=>{
    try {
        const {}=res.body
    } catch (error) {
        
    }
}

export const getExam = async (req, res) => {
    try {
        const exams = await Exam.find();
        res.status(200).json(exams);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
}

