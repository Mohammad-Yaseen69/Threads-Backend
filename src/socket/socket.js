import { Server } from "socket.io"
import app from "../app.js";
import http from "http"


const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true
    }
});



io.on("connection", (socket) => {
    console.log("A user connected", socket.id)

    socket.on("disconnect", () => {
        console.log("User disconnected")
    })
})

export {
    server,
    io
}