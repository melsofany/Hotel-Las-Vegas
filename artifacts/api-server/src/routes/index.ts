import { Router, type IRouter } from "express";
import healthRouter from "./health";
import roomsRouter from "./rooms";
import employeesRouter from "./employees";
import guestsRouter from "./guests";
import reservationsRouter from "./reservations";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(roomsRouter);
router.use(employeesRouter);
router.use(guestsRouter);
router.use(reservationsRouter);
router.use(dashboardRouter);

export default router;
