import { Router } from "express"
import { addReply, createPost, deletePost, deleteReply, getAllPosts, getPost, likeReply, likeToggle } from "../controller/post.controllers.js"
import { userAuth } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router()


router.get("/:postId", getPost)
router.get("/", getAllPosts)

// Protected Routes

router.post("/create", userAuth, upload.single("media"), createPost)
router.delete("/delete/:postId", userAuth, deletePost)
router.post("/like/:postId" , userAuth, likeToggle)
router.post("/reply/:postId", userAuth, addReply)
router.delete("/reply/:postId/:replyId", userAuth, deleteReply)
router.post("/reply/like/:postId/:replyId", userAuth, likeReply)

export default router;  