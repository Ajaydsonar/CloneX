import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username cannot be empty!"],
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-zA-Z0-9_]{3,20}$/i,
    },
    email: {
      type: String,
      required: [true, "email is required!"],
      unique: true,
      lowercase: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    fullName: {
      type: String,
      required: [true, "Full Name is required!"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "password cannot be empty!"],
      minlength: 6,
    },
    bio: {
      type: String,
      trim: true,
      default: "",
    },
    avatar: {
      type: String, //cloudinary url
      required: [true, " Your Avatar is required!"],
    },
    coverImage: {
      type: String, // cloudinary url
    },
    dob: {
      type: Date,
    },
    tweets: [
      {
        type: Schema.Types.ObjectId,
        ref: "Tweet",
      },
    ],
    reTweets: [
      {
        type: Schema.Types.ObjectId,
        ref: "Retweet",
      },
    ],
    followers: [{ type: Schema.Types.ObjectId, ref: "Follow" }],
    following: [{ type: Schema.Types.ObjectId, ref: "Follow" }],
    savedTweets: [{ type: Schema.Types.ObjectId, ref: "Tweet" }],
    location: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      lowercase: true,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.refreshAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
