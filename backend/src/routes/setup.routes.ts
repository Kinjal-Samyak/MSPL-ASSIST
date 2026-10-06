import { Router } from "express";
import { SetupController } from "../controllers/setup.controller";

const router = Router();
const controller = new SetupController();

router.post("/bootstrap", controller.bootstrap);

export default router;

