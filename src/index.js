import dotenv from "dotenv"
import app from "./app.js"
import {connectDB} from "./db/connectDB.js"
import { server } from "./socket/socket.js"

dotenv.config({
    path: "./.env"
})


connectDB().then(() => {
    server.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT}`)
    })
}).catch((err) => {
    console.log("MongoDB connection error. " + err)
})