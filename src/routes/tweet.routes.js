import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
    createTweet, deleteTweet, getUserTweets, updateTweet
} from "../controllers/tweet.controller.js";

const router = Router();

router.use(verifyJWT, upload.none());

//creates tweet 
router
.route('/')
.post(createTweet);

//Get User Tweets
router
.route('/user/:userId')
.get(getUserTweets);

//Update users tweet
router
.route('/:tweetId')
.patch(updateTweet);

//Delete any users tweet
router
.route('/:tweetId')
.delete(deleteTweet);

export default router;
