import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import { generateTokenAndSetCookie } from "../lib/generateTokenAndSetCookie.js";

export const register = async (req, res) => {
  try {
    const { username, password, email } = req.body;
    let { profilePicture } = req.body;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already taken" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    if (profilePicture) {
      try {
        const uploadedResponse = await cloudinary.uploader.upload(
          profilePicture
        );
        profilePicture = uploadedResponse.secure_url;
      } catch (uploadError) {
        return res
          .status(400)
          .json({ error: "Failed to upload profile picture" });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      profilePicture: profilePicture || "",
    });

    await newUser.save();

    generateTokenAndSetCookie(newUser._id, res);

    res.status(201).json({
      message: "User registered successfully",
      data: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        profilePicture: newUser.profilePicture,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "User does not exist" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Password Wrong" });
    }

    generateTokenAndSetCookie(user._id, res);

    res.status(200).json({
      message: "Login successful",
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "User retrieved successfully",
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    res.cookie("jwt", "", {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { username, email } = req.body;
    let { profilePicture } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: "Username is already taken" });
      }
    }

    if (email && email !== user.email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: "Email is already taken" });
      }
    }

    if (profilePicture) {
      try {
        if (user.profilePicture) {
          const publicId = user.profilePicture.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        }

        const uploadedResponse = await cloudinary.uploader.upload(
          profilePicture
        );
        profilePicture = uploadedResponse.secure_url;
      } catch (uploadError) {
        return res
          .status(400)
          .json({ error: "Failed to upload profile picture" });
      }
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (profilePicture) user.profilePicture = profilePicture;

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ error: "Password is required to delete account" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Password is incorrect" });
    }

    if (user.profilePicture) {
      try {
        const publicId = user.profilePicture.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.error("Error deleting profile picture:", error);
      }
    }

    await User.findByIdAndDelete(userId);

    res.cookie("jwt", "", {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
