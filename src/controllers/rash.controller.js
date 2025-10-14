import { Exam } from "../models/test.model.js";
import { trueAnswer } from "./test.controller.js";
export const getRashmodule = async (req, res) => {
    try {
        const responce = await Exam.find();
        if (!responce || responce.length == 0) {
            return res.status(200).json([])
        }
        let students_count=responce.length
        let new_students = []
        let currect_answers=new Array(30).fill(0);

        responce.map((el) => {
            const testTrueFalse = []
            el.test.map((res, index) => {
                currect_answers[index]=currect_answers[index]+(res === trueAnswer[index] ? 1 : 0)
                testTrueFalse.push(res === trueAnswer[index] ? 1 : 0)
            })
            new_students.push({ user_id: el.user_id, name: el.name, test: testTrueFalse })
        })
        
        let possiblity=[]

        currect_answers.map((el)=>{
            let p=el/students_count
            let b=0
            if(p==0||p==1){
                b=4*(1-p);
            }else{
                b=-Math.log(p/(1-p))
            }
            possiblity.push(b)
        })

        const min = Math.min(...possiblity);
        let balls=[]
        let summa_ball=0
        possiblity.map((poss)=>{
            balls.push(min*(-1)+poss+1)
            summa_ball+=min*(-1)+poss+1
        })

        let skills_array=[]

        new_students=new_students.map((el)=>{
            let currect=0
            el.test.map((test,idx)=>{
                currect+=test*balls[idx]
            })
            let incorect=summa_ball-currect!==0?summa_ball-currect:1
            let skill=Math.log((currect??1)/incorect)
            skills_array.push(Math.log((currect??1)/incorect))
            return {...el,incorect,currect,skill}
        })

        const skil_calculateMean = skills_array.reduce((acc, value) => acc + value, 0)/(students_count);
        const skil_root=Math.sqrt(skills_array.reduce((acc, value) => acc + value ** 2, 0)/(students_count))

        new_students=new_students.map((el)=>{
            let z_coficent=(el.skill-skil_calculateMean)/skil_root
            let total_ball=50+z_coficent*20
            return {...el,total_ball,skil_calculateMean,skil_root}
        })


        res.status(200).json(new_students);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
}

