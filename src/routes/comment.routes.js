import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    addComment, deleteComment, getVideoComments, updateComment
} from  "../controllers/comment.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

//Authentication for every route
router.use(verifyJWT, upload.none());

//Add Comment on any video
router
.route('/:videoId')
.post(addComment);

//Get All Comments on a video
router
.route('/:videoId')
.get(getVideoComments);

//Update a comment
router
.route('/c/:commentId')
.patch(updateComment);

//Delete Comment
router
.route('/c/:commentId')
.delete(deleteComment);

export default router;