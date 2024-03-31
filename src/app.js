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


//routes import
import userRouter from "./routes/user.routes.js"
import videoRouter from "./routes/video.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import playlistRouter from "./routes/playlist.routes.js";


//routes declaration
app.use("/api/v1/user", userRouter);
app.use("/api/v1/video", videoRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("api/v1/playlist", playlistRouter);

export {app};
