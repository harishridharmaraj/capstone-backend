import mongoose, { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, required: true, default: "user" },
    passwordtoken: String,
    tokenexpiry: Date,
    account: Boolean,
    accounttoken: String,
    authToken: String,
    sector: String,
    field: String,
    experience: String,
    phone: String,
    qualifications: String,
    location: String,
    address: String,
    pincode: String,
    queries: [
      {
        queryId: { type: mongoose.Schema.Types.ObjectId, ref: "Query" },
        querynumber: { type: String, unique: true, sparse: true },
      },
    ],
    mentorQueries: [
      {
        queryId: { type: mongoose.Schema.Types.ObjectId, ref: "Query" },
        querynumber: { type: String, unique: true, sparse: true },
      },
    ],
  },
  { timestamps: true }
);

const UserModel = model("User", UserSchema);

export default UserModel;
