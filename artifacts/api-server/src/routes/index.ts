import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import roomsRouter from "./rooms";
import employeesRouter from "./employees";
import guestsRouter from "./guests";
import reservationsRouter from "./reservations";
import dashboardRouter from "./dashboard";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(roomsRouter);
router.use(employeesRouter);
router.use(guestsRouter);
router.use(reservationsRouter);
router.use(dashboardRouter);
router.use(storageRouter);

export default router;
