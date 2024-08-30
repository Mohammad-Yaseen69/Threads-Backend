import express from "express"
import cookieParser from "cookie-parser"

const app = express()


app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(express.static("public"))


// Routes

import userRouter from "./routes/user.routes.js"
import postRouter from "./routes/post.routes.js"


app.use("/api/v1/users", userRouter)
app.use("/api/v1/posts", postRouter)


export default app