import express , {Express } from 'express'
import cookieParser from "cookie-parser";
import cors from "cors";
import { healthCheck } from './controllers/healthCheck.controller';
import userRouter from "./routes/user.route"
import problemRouter from "./routes/problem.route"
import executeRouter from './routes/executeCode.route';
import submissionRouter from "./routes/submission.route"
import playlistRouter from "./routes/playlist.route"
import { errorHandler } from './middlewares/error.middleware';

const app :Express  =  express();

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser());
app.use(cors())

app.get('/', healthCheck)
app.use("/api/v1/user", userRouter )
app.use('/api/v1/problem', problemRouter)
app.use('/api/v1/executeCode', executeRouter)
app.use('/api/v1/submission', submissionRouter)
app.use('/api/v1/playlist', playlistRouter)


app.use(errorHandler)


export default app;
