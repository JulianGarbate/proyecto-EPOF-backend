import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import routes from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

// Required for correct req.ip behind Vercel/Render/Heroku reverse proxies,
// so express-rate-limit reads X-Forwarded-For instead of the proxy's IP.
app.set("trust proxy", 1);

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:4000",
  "https://proyecto-epof.vercel.app",
  process.env.FRONTEND_URL,
].filter((v): v is string => Boolean(v));

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) { callback(null, true); return; }

    const isExact = ALLOWED_ORIGINS.includes(origin);
    const isOwnPreview = /^https:\/\/proyecto-epof[\w-]*\.vercel\.app$/.test(origin);

    callback(null, isExact || isOwnPreview);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json());

app.use("/api", routes);

app.use(errorHandler);

export default app;
