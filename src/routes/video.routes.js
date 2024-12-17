import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { deleteVideo, getAllVideos, 
        getVideoById, 
        publishAVideo, 
        togglePublishStatus, 
        updateVideo } 
from "../controllers/video.controller.js";

const router = Router();

router
.route('/')
.get(getAllVideos);

router
.route('/')
.post(
    verifyJWT,
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    publishAVideo
);

router
.route('/v/:videoId')
.patch(
    verifyJWT,
    upload.single("thumbnail"),
    updateVideo
);

router
.route('/v/:videoId')
.get(
    verifyJWT,
    getVideoById
);

router
.route('/v/:videoId')
.delete(
    verifyJWT,
    deleteVideo
)

router
.route('/toggle/publish/:videoId')
.patch(
    verifyJWT,
    togglePublishStatus
);

export default router;
