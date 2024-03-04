import connectDB from "./db/index.js";
import dotenv from "dotenv";

//Configuring Environment variables
//Note-> if there is some issue in loading these env variables then might not able to connect to database
dotenv.config();

//Starting Database Connection 
connectDB()
.then( () => {
    
    //If not environment variable PORT then use 8000
    const PORT = process.env.PORT || 8000;
    try {
        app.on("error", (error) => {
            console.log("ERROR: ", error);
            throw error;
        })

        app.listen(PORT, () => {
            console.log(`Server is listening on PORT ${PORT}`);
        })
    } catch (error) {
        
    }
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})