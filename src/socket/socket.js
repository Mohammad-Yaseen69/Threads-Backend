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

const onlineUsers = {}


io.on("connection", (socket) => {
    console.log("A user connected", socket.id)
    const userId = socket.handshake.query.userId


    if(userId !== "undefined"){
        onlineUsers[userId] = socket.id
    }

    socket.emit("getOnlineUsers" , Object.keys(onlineUsers))

    socket.on("disconnect", () => {
        console.log("User disconnected")
    })
})

export {
    server,
    io
}