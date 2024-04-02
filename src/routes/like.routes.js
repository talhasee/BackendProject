import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getLikedVideos,
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike
} from "../controllers/like.controller.js";

const router = Router();

//Authentication for every route
router.use(verifyJWT);

//Toggle like for any video
router
.route('/toggle/v/:videoId')
.post(toggleVideoLike);

//Get All Liked Videos
router
.route('/videos')
.get(getLikedVideos);

//Toggle like for any comment
router
.route('/toggle/c/:commentId')
.post(toggleCommentLike);

//Toggle like for any Tweet
router
.route('/toggle/t/:tweetId')
.post(toggleTweetLike);

export default router;