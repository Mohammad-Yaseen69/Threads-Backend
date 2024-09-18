import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express()


app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(express.static("public"))

app.use(cors({
    // origin: function (origin, callback) {
    //     // Allow requests from your specified domain or localhost IPs
    //     if (origin === process.env.CORS_ORIGIN || origin === 'http://192.168.1.111:5173' || origin === 'http://localhost:5173') {
    //         callback(null, true);
    //     } else {
    //         callback(new Error('Not allowed by CORS'));
    //     }
    // },
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