import { Router } from "express";
import { healthCheck } from "../controllers/healthcheck.controller.js";

const router = Router();

//Get health check results
router
.route("/")
.get(healthCheck);

export default router;