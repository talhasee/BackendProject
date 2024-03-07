import { Router } from "express";
import {loginUser, logoutUser, refresAccessToken, registerUser} from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar", //frontend field should of same name
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)


router.route("/login").post(
    loginUser
)


//Secure Routes

router.route("/logout").post(
    verifyJWT,
    logoutUser
)

router.route("/refresh-token").post(
    refresAccessToken
)

export default router