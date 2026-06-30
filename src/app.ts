import express from "express";
import cors from "cors";
import routes from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

const corsOptions: cors.CorsOptions = {
	origin(origin, callback) {
		if (!origin) {
			callback(null, true);
			return;
		}

		const isAllowed = [
			"http://localhost:3000",
			"https://proyecto-epof.vercel.app",
			process.env.FRONTEND_URL,
		]
			.filter((value): value is string => Boolean(value))
			.includes(origin);

		callback(null, isAllowed);
	},
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
	optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
	const allowedOrigins = new Set([
		"http://localhost:3000",
		"https://proyecto-epof.vercel.app",
		process.env.FRONTEND_URL,
	].filter((value): value is string => Boolean(value)));

	const origin = req.headers.origin;
	if (origin && allowedOrigins.has(origin)) {
		res.setHeader("Access-Control-Allow-Origin", origin);
		res.setHeader("Access-Control-Allow-Credentials", "true");
		res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
	}

	if (req.method === "OPTIONS") {
		res.sendStatus(200);
		return;
	}

	next();
});
app.use(express.json());

app.use("/api", routes);

app.use(errorHandler);

export default app;
