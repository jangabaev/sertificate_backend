import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js"; // Agar fayl kengaytmasi bo'lsa .js qo'shing
import CryptoJS from "crypto-js";

export const createUser = async (req, res) => {
   try {
      const { user_id, username, first_name, last_name } = req.body
      const user = await prisma.user.create({
         data: {
            user_id,
            username,
            first_name,
            last_name,
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
      console.log(error)

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
      let userId = CryptoJS.AES.decrypt(header, process.env.JWT_SECRET).toString(
         CryptoJS.enc.Utf8
      );
      const responce = await prisma.user.findFirst({
         where: {
            user_id: Number(userId)
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