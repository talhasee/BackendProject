import connectDB from "./db/index.js";
import dotenv from "dotenv";

//Configuring Environment variables
//Note-> if there is some issue in loading these env variables then might not able to connect to database
dotenv.config();

//Starting Database Connection
connectDB();