import { Router } from "express";
import {
    register,
    login,
    logout,
    followUnfollowUser,
    listAllUsers,
    getUserProfile,
    addingUserData,
    userFeed,
    getLoggedInUser,
    changePassword,
    changeUserName,
    getSuggestedUsers,
    searchUsers
} from "../controller/user.controllers.js"
import { userAuth } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router();


router.post("/register", register)
router.post("/login", login)
router.get("/list", listAllUsers)

//Protected Routes

router.get("/logout", userAuth, logout)
router.post("/follow/:id", userAuth, followUnfollowUser)
router.post("/add", userAuth, upload.single("pfp"), addingUserData)
router.get("/getUser", userAuth, getLoggedInUser)
router.post("/changePassword", userAuth, changePassword)
router.post("/changeUserName", userAuth, changeUserName)
router.get("/profile/:userName", userAuth, getUserProfile)
router.get("/feed", userAuth, userFeed)
router.get("/suggested", userAuth, getSuggestedUsers)
router.get("/search", userAuth, searchUsers)

export default router;