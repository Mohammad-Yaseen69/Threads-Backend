import { Router } from "express";
import {userAuth} from "../middlewares/auth.middleware.js"
import {sendMessage, getMessages, getConversations , deleteMessage, deleteConversation, allowUserToChat, getOrCreateConversation, canAllow} from "../controller/chat.controller.js"

const router = Router();

router.post("/send/:id", userAuth, sendMessage)
router.get("/get/messages/:id", userAuth, getMessages)
router.get("/get/conversations", userAuth, getConversations)
router.delete("/delete/message/:id/:conversationId", userAuth, deleteMessage)
router.delete("/delete/conversation/:id", userAuth, deleteConversation)
router.post("/allow/:id", userAuth, allowUserToChat)
router.get("/canAllow/:id", userAuth, canAllow)
router.post("/getOrCreateConversation/:id", userAuth, getOrCreateConversation)

export default router;