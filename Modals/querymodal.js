import mongoose, { Schema, model } from "mongoose";

const QuerySchema = new Schema(
  {
    querynumber: { type: String },
    category: String,
    subCategory: String,
    tags: Array,
    language: String,
    title: String,
    description: String,
    from: String,
    to: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now() },
    job: { type: String, default: "chat" },
    status: { type: String, default: "Open" },
    chats: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

const QueryModel = model("Query", QuerySchema);

export default QueryModel;
