import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express()


app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(express.static("public"))

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));



// Routes

import userRouter from "./routes/user.routes.js"
import postRouter from "./routes/post.routes.js"
import chatRouter from "./routes/chat.routes.js"


app.use("/api/v1/users", userRouter)
app.use("/api/v1/posts", postRouter)
app.use("/api/v1/chats", chatRouter)


export default app