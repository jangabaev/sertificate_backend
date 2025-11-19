import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";
import CryptoJS from "crypto-js";

export const registerUser = async (req, res) => {
  try {
    const { user_id, username, first_name, last_name } = req.body;
    console.log(req.body);
    if (!user_id) {
      return res.status(400).json({ message: "All fields required" });
    }

    console.log("1");

    const exist = await User.findOne({ user_id });
    if (exist) return res.status(400).json({ message: "User already exists" });
    // const hashed = await bcrypt.hash(user_id, 10);
    console.log("2");
    const user = await User.create({
      user_id,
      username,
      first_name,
      last_name,
      tests: [],
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        user_id: user.user_id,
        username: user.username,
        first_name: user.first_name,
      },
    });
    console.log("✅ User created:", user.user_id);
  } catch (err) {
    console.error("❌ Error creating user:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getUserById = async (req, res) => {
  try {
    const header = req.headers.token;
    if (!header) {
      return res.status(400).json({ message: "No token provided" });
    }
    let userId = CryptoJS.AES.decrypt(header, process.env.JWT_SECRET).toString(
      CryptoJS.enc.Utf8
    );
    if (!userId) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const user = await User.findOne({ user_id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
