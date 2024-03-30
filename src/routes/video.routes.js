import { Router } from "express";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { getVideoById, publishAVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js";
import { buildVideoUrl } from "cloudinary-build-url";

const router = Router();

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
.route('/toggle/publish/:videoId')
.patch(
    verifyJWT,
    togglePublishStatus
);

export default router;
