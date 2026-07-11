import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In production this single service also serves the pre-built frontend
// (artifacts/hotel-admin) since Render only runs the api-server process.
if (process.env["NODE_ENV"] === "production") {
  const clientDistDir = path.join(
    // "__dirname" is injected by the esbuild banner and points at the
    // bundled dist directory (artifacts/api-server/dist).
    __dirname,
    "../../hotel-admin/dist/public",
  );

  app.use(express.static(clientDistDir));

  // SPA fallback: any non-API GET request should return index.html so
  // client-side routing works on full page loads/refreshes.
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDistDir, "index.html"));
  });
}

export default app;
