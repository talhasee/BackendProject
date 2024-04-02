import { Router } from "express";
import {
    getChannelStats, getChannelVideos
} from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

//Get Channel Stats
router
.route('/stats')
.get(getChannelStats);

//Get all videos of a Channel
router
.route('/videos')
.get(getChannelVideos);

export default router;