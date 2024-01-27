import mongoose, { Schema, model } from "mongoose";

const MessageSchema = new Schema(
  {
    queryId: { type: mongoose.Schema.Types.ObjectId, ref: "Query" },
    querynumber: { type: String },
    chatUsers: Array,
    message: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        Message: String,
      },
    ],
  },
  { timestamps: true }
);

const MessageModel = model("Message", MessageSchema);

export default MessageModel;
