import express from "express";
import cors from "cors";
import routes from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

const corsOptions: cors.CorsOptions = {
	origin(origin, callback) {
		// Allow server-to-server requests (no origin header)
		if (!origin) {
			callback(null, true);
			return;
		}

		const allowedExact = [
			"http://localhost:3000",
			"http://localhost:4000",
			"https://proyecto-epof.vercel.app",
			process.env.FRONTEND_URL,
		].filter((value): value is string => Boolean(value));

		// Also allow any Vercel preview deployment (*.vercel.app)
		const isVercelPreview = /^https:\/\/[\w-]+\.vercel\.app$/.test(origin);

		const isAllowed = allowedExact.includes(origin) || isVercelPreview;

		callback(null, isAllowed);
	},
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api", routes);

app.use(errorHandler);

export default app;
