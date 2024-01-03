import mongoose, { Schema } from "mongoose";

const followSchema = new Schema(
  {
    follower: {
      type: Schema.Types.ObjectId, // peoples who are following the user
      ref: "User",
    },
    following: {
      type: Schema.Types.ObjectId, // people who are followed by user
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Follow = mongoose.model("Follow", followSchema);
