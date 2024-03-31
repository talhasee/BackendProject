import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { createPlaylist } from "../controllers/playlist.controller.js";

const router = Router();

router.use(verifyJWT, upload.none());

router
.route('/')
.post(createPlaylist);

export default router;