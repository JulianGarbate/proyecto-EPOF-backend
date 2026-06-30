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
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api", routes);

app.use(errorHandler);

export default app;
