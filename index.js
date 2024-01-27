import express from "express";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt";
import UserModel from "./Modals/usermodals.js";
import nodemailer from "nodemailer";
import randomstring from "randomstring";
import jwt from "jsonwebtoken";
import { auth } from "./Middleware/auth.js";
import QueryModel from "./Modals/querymodal.js";
import MessageModel from "./Modals/messagemodal.js";

const app = express();
app.use(cors({ credentials: true }));
dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const mailpass = process.env.mailpass;

const tokentiming = new Date();
tokentiming.setMinutes(tokentiming.getMinutes() + 5);
const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: "support@doubtguru.in",
    pass: mailpass,
  },
});
// ---------------------------------------------------------------------Register Page
// ---Register the user and send mail
app.post("/register", async (req, res) => {
  const { email, pass } = req.body;
  try {
    const activationToken = randomstring.generate(32);
    const salt = await bcrypt.genSalt(10);
    const hashedpassword = await bcrypt.hash(pass, salt);

    const users = await UserModel.create({
      ...req.body,
      accounttoken: activationToken,
      password: hashedpassword,
    });
    res.status(200).send("User Created");
    const activationmail = `Welcome to Doubt Guru<br/>
  
      To activate your account, please <a href='http://localhost:4000/account/${activationToken}'>click here</a><br/>
      
      If you did not make this request and are concerned about the security of your account, Kindly ignore this mail.
      <br/>
      Best Regards,<br/>
      Doubt Guru`;

    const info = await transporter.sendMail({
      from: "Doubt Guru <support@doubtguru.in>",
      to: email,
      subject: "Account Activation✌️",
      html: activationmail,
    });
    console.log("Message sent:" + info.messageId);
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});
// User Mail and Account verfication
app.get("/account/:verification", async (req, res) => {
  const { verification } = req.params;
  const users = await UserModel.find({ accounttoken: verification });
  if (users) {
    const accverify = await UserModel.findOneAndUpdate(
      { accounttoken: verification },
      { account: true, $unset: { accounttoken: 1 } }
    );
    if (accverify) {
      res.redirect("http://localhost:3000/login");
    } else {
      res.status(500).send("Error Verifying Account");
    }
  } else {
    res.send("User not found");
    console.log("User not found");
  }
});

// -----------------------------------------------------------------------Forgot Password
app.put("/forgetpass", async (req, res) => {
  const { email } = req.body;
  const resetToken = randomstring.generate(32);
  try {
    await UserModel.findOneAndUpdate(
      {
        email: email,
      },
      { passwordtoken: resetToken, tokenexpiry: tokentiming }
    );
    res.send("Password Token Updated");
    const resetmail = `We received your request to change your account password.<br/>
  
    To reset your password please <a href='http://localhost:3000/request/${resetToken}'>click here</a><br/>
    
    If you did not make this request and are concerned about the security of your account, Kindly ignore this mail.
    <br/>
    Best Regards,<br/>
    Doubt Guru`;

    await transporter.sendMail({
      from: "Doubt Guru <support@doubtguru.in>",
      to: email,
      subject: "Password Reset - DoubtGuru✌️",
      html: resetmail,
    });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});
// Password reset page, and save the new Password
app.put("/request/:token", async (req, res) => {
  const { pass } = req.body;
  const { token } = req.params;
  const salt = await bcrypt.genSalt(10);
  const hashedpassword = await bcrypt.hash(pass, salt);
  const users = await UserModel.find({
    passwordtoken: token,
  });
  if (users) {
    const updatepass = await UserModel.findOneAndUpdate(
      { passwordtoken: token, tokenexpiry: { $lte: new Date() } },
      { password: hashedpassword, $unset: { passwordtoken: 1, tokenexpiry: 1 } }
    );
    if (updatepass) {
      res.send("Password changed successfully");
    } else {
      res.status(500).send("Error updating password");
    }
  } else {
    res.send("User not found");
    console.log("User not found");
  }
});

// Login Page and JWT signin
app.post("/login", async (req, res) => {
  const { email, pass } = req.body;
  const user = await UserModel.findOne({ email: email });

  if (user) {
    const passMatch = await bcrypt.compare(pass, user.password);

    if (passMatch) {
      const usertoken = jwt.sign(
        { email: user.email, id: user._id, role: user.role },
        process.env.secret_key,
        { expiresIn: "1h" }
      );
      res.json(usertoken);
    } else {
      res.status(404).json({
        error: "Invalid Credentials",
      });
    }
  } else {
    res.status(500).json({ error: "Invalid Credentials" });
  }
});
// Dashboard jwt auth
app.get("/dashboard", auth, async (req, res) => {
  const email = req.email;
  try {
    const user = await UserModel.findOne({ email: email });

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Testing Link
app.get("/users", async (req, res) => {
  const response = await UserModel.find({}, "-password");

  res.json(response);
});
// Listening Port
app.listen(4000, () => {
  console.log("Port is on 4000");
});
// MongoDB connect
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MONGO DB is Connected");
  })
  .catch((error) => {
    console.log("Mongo Connection Error", error);
  });
// Query Creating Page
app.post("/create", async (req, res) => {
  try {
    const { querydata, email } = req.body;
    const user = await UserModel.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const query = await QueryModel.create(querydata);
    user.queries.push({ queryId: query._id, querynumber: query.querynumber });
    const updatedUser = await user.save();

    res.status(200).json({ message: "Query added successfully", user: query });
  } catch (error) {
    console.error("Error adding query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ---------------------------------------------------------------------Query Page
// To get query data/user to the querypage
app.get("/query", auth, async (req, res) => {
  const email = req.email;
  const user = await UserModel.findOne({ email: email })
    .populate("queries.queryId")
    .exec();
  res.json(user);
});
// ---------------------------------------------------------------------Chat Page
app.get("/query/:id", auth, async (req, res) => {
  const email = req.email;
  const { id } = req.params;
  const user = await UserModel.findOne({ email: email })
    .populate("queries.queryId")
    .exec();

  if (user.role === "admin") {
    const oneQry = await QueryModel.findOne({ querynumber: id });
    res.json(oneQry);
    console.log("Logged in as Admin");
  }
  if (user.role === "mentor") {
    const check = await UserModel.findOne({ email: email })
      .populate("queries.queryId")
      .populate("mentorQueries.queryId")
      .exec();
    res.json(check);
  }
  if (user.role === "user") {
    const check = await QueryModel.find({ querynumber: id })
      .populate("user")
      .exec();
    // const checkqry = user.queries.find((item) => item.querynumber === id);

    res.json(user);
  }
});
// ---------------------------------------------------------------------Admin Page, All user data
app.get("/admin", auth, async (req, res) => {
  const email = req.email;
  const admin = await UserModel.findOne({ email: email });
  if (admin.role === "admin") {
    const data = await UserModel.find({});
    res.json(data);
  } else {
    res.status(400).json({ error: "you are not admin" });
  }
});
// assign mentors to queries, QueryFetch Model
app.get("/assignmentors", auth, async (req, res) => {
  const mentor = await QueryModel.find({});

  if (mentor) {
    res.json(mentor);
  } else {
    res.json({ error: "Mentor data cannot be Fetched" });
  }
});
// convert Users to Mentors
app.post("/creatementors", async (req, res) => {
  const { mentorEmail } = req.body;
  try {
    const activationToken = randomstring.generate(32);

    const mentors = await UserModel.findOneAndUpdate(
      { email: mentorEmail, role: "user" },
      { accounttoken: activationToken }
    );
    if (mentors) {
      res.status(200).send({ message: "Mentor Mail Sent" });

      const activationmail = `Welcome to Doubt Guru Mentor Portal<br/>
  
      To activate your Mentor account, please <a href='http://localhost:3000/mentors/${activationToken}'>click here</a><br/>
      
      If you did not make this request and are concerned about the security of your account, Kindly ignore this mail.
      <br/>
      Best Regards,<br/>
      Doubt Guru`;

      const info = await transporter.sendMail({
        from: "Doubt Guru <support@doubtguru.in>",
        to: mentorEmail,
        subject: "Mentor Account Activation✌️",
        html: activationmail,
      });
      console.log("Message sent:" + info.messageId);
    }
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});

// Get Mentor Details and Save to the user and convert them to Mentor
app.post("/mentor/:verification", async (req, res) => {
  const { verification } = req.params;
  const { mentordetails } = req.body;

  const users = await UserModel.find({ accounttoken: verification });

  if (users) {
    const accverify = await UserModel.findOneAndUpdate(
      { accounttoken: verification },
      {
        $set: {
          role: "mentor",
          sector: mentordetails.sector,
          field: mentordetails.field,
          experience: mentordetails.experience,
          phone: mentordetails.phone,
          qualifications: mentordetails.qualifications,
          location: mentordetails.location,
          address: mentordetails.address,
          pincode: mentordetails.pincode,
        },
        $unset: { accounttoken: 1 },
      },
      { new: true } // Return the modified document
    );
    console.log("working");
    if (accverify) {
      res.status(200).json("Mentor Details Updated");
    } else {
      res.status(500).send("Error Verifying Account");
    }
  } else {
    res.send("User not found");
    console.log("User not found");
  }
});
// Assign mentors to queries
app.post("/qryassign", async (req, res) => {
  try {
    const { selectedMentorId, queryNumber } = req.body;
    const user = await UserModel.findOne({ _id: selectedMentorId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const query = await QueryModel.findOne({ querynumber: queryNumber });
    user.mentorQueries.push({
      queryId: query._id,
      querynumber: query.querynumber,
    });
    const updatedUser = await user.save();

    const mentorToQueries = await QueryModel.findOneAndUpdate(
      { querynumber: queryNumber },
      { role: "mentor", status: "Assigned", mentor: selectedMentorId }
    );
    res.status(200).json("Query Assigned");
  } catch (error) {
    return res.status(500).json({ error: "Assigning Error" });
  }
});
app.get("/querydata", auth, async (req, res) => {
  const query = await QueryModel.find({});
  res.json(query);
});
app.get("/mentorqry", auth, async (req, res) => {
  const email = req.email;
  const user = await QueryModel.find({});
  res.json(user);
});
app.get("/mentorprofile", auth, async (req, res) => {
  const email = req.email;
  const mentor = await UserModel.findOne({ email: email });
  res.json(mentor);
});
app.put("/solvedqry", async (req, res) => {
  const { queryNumber } = req.body;
  const query = await QueryModel.findOneAndUpdate(
    { querynumber: queryNumber },
    { status: "closed" }
  );

  if (query) {
    res.status(200).json("Query Closed Successfully");
  }
});
// ----------------------------------------------------------------------------------------
app.get("/chats/:querynum", async (req, res) => {
  const { querynum } = req.params;
  const chats = await MessageModel.findOne({
    querynumber: querynum,
  });

  res.status(200).json(chats);
});
app.post("/chats", async (req, res) => {
  try {
    const { querynum, queryid, from, message } = req.body;
    const chats = await MessageModel.findOne({ querynumber: querynum });
    if (!chats) {
      const res = await MessageModel.create({
        queryId: queryid,
        querynumber: querynum,
        message: [
          {
            sender: from,
            Message: message,
          },
        ],
      });

      await QueryModel.findOneAndUpdate(
        { _id: queryid },
        {
          chats: res._id,
        }
      );
    } else {
      chats.message.push({ sender: from, Message: message });
      const updatedChat = await chats.save();
    }
    res.status(200).json("Chat Saved");
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});
