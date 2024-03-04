import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
//more parameters can be configured
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

//
app.use(
  express.json({
    limit: "16Kb",
  })
);

//to encode incoming url
app.use(
  express.urlencoded({
    extended: true,
    limit: "16Kb",
  })
);

//can be used to store public data....thats we created public folder
app.use(express.static("public"));

app.use(cookieParser());



export default app;
