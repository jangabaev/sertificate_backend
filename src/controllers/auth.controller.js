import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { deshifr } from "../utils/dechifr.js";

export const createUser = async (req, res) => {
   try {
      const { user_id, username, first_name, last_name } = req.body
      console.log(1)

      const strUserId = String(user_id)

      const existing = await prisma.user.findFirst({ where: { user_id: strUserId } })
      if (existing) {
         return res.status(409).json({ message: "User already exists" })
      }

      const user = await prisma.user.create({
         data: {
            user_id: strUserId,
            username: username || null,
            first_name: first_name || null,
            last_name: last_name || null,
            balance:0
         }
      })

      res.status(201).json(user)
   } catch (error) {
      console.log(error)
      res.status(500).json({
         message: "Error creating user"
      })
   }
}

export const getUsers = async (req, res) => {
   try {
      const users = await prisma.user.findMany()

      res.json(users)
   } catch (error) {

      res.status(500).json({
         message: "Error getting users"
      })
   }
}

export const getUserbyId = async (req, res) => {
   try {
      const header = req.headers.token;
      if (!header) {
         return res.status(400).json({ message: "No token provided" });
      }
      let userId = deshifr(header);
      const responce = await prisma.user.findFirst({
         where: {
            user_id: String(userId)
         }
      })
      res.json(responce)
   } catch (error) {
      console.log(error)

      res.status(500).json({
         message: "Error getting users"
      })
   }
}

export const upBalance=async (req,res)=>{
   try {
      const token=req.headers.token
      const {amount}=req.body

       if (!token) {
         return res.status(400).json({ message: "No token provided" });
      }
       
      let userId = deshifr(token) 

       const responce = await prisma.user.findFirst({
         where: {
            user_id: String(userId)
         }
      })

      if(!responce){
         return res.status(400).json({ message: "No token provided" });
      }

      const responceUser= await prisma.user.update({
         where:{
            user_id:String(userId)
         },
         data:{
            balance:Number(responce.balance)+Number(amount)
         }
      })

      return res.json(responceUser)
       
   } catch (error) {
      console.log(error)

      res.status(500).json({
         message: "Error getting users"
      })
   }
}
