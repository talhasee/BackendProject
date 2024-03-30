import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controllers/subscription.controller.js";

const router = Router();

//verify on all routes
router.use(verifyJWT);

router
.route('/ch/:channelId')
.post(toggleSubscription);

router
.route('/ch/:channelId')
.get(getUserChannelSubscribers);

router
.route('/u/:subscriberId')
.get(getSubscribedChannels);


export default router;
