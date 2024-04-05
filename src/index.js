import connectDB from "./db/index.js";
import dotenv from "dotenv";
import app from "./app.js";

//Configuring Environment variables
//Note-> if there is some issue in loading these env variables then might not able to connect to database
dotenv.config({
  path: './.env'
});

//Starting Database Connection
connectDB()
  .then(() => {
    //If not environment variable PORT then use 8000
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      console.log(`Server is listening on PORT ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });

// Export the serverless function
export default app;