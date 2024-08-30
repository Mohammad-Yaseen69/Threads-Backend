import { Router } from "express";
import {
    register,
    login,
    logout,
    followUnfollowUser,
    listAllUsers,
    getUserProfile,
    addingUserData,
    userFeed
} from "../controller/user.controllers.js"
import { userAuth } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router();


router.post("/register", register)
router.post("/login", login)
router.get("/list", listAllUsers)
router.get("/profile/:userName", getUserProfile)
router.get("/feed", userAuth, userFeed)

//Protected Routes

router.get("/logout", userAuth, logout)
router.post("/follow/:id", userAuth, followUnfollowUser)
router.post("/add", userAuth, upload.single("pfp"), addingUserData)

export default router;