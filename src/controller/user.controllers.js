import { Post } from "../models/post.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFile, uploadFile } from "../utils/firebaseHelpers.js"
import fs from "fs"
import mongoose from "mongoose"


const cookieOption = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 30 * 24 * 60 * 60 * 1000
}

const generateTokenForCookie = async (user) => {
    try {
        const token = await user.generateToken()
        user.token = token

        await user.save({ validateBeforeSave: false })

        return token
    } catch (error) {
        throw new ApiError("Something went wrong while generating Tokens", 500)
    }
}

const register = asyncHandler(async (req, res) => {
    const { userName, email, password, name } = req.body

    if (!userName || !email || !password || !name) {
        throw new ApiError(400, "All fields are required")
    }

    if (password.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters long")
    }

    if (email.includes("@") === false) {
        throw new ApiError(400, "Invalid email address")
    }

    const existingEmail = await User.findOne({ email })

    if (existingEmail) {
        throw new ApiError(400, "User already Existed")
    }

    const existingUserName = await User.findOne({ userName })

    if (existingUserName) {
        throw new ApiError(400, "Username is taken")
    }

    const user = await User.create({
        userName,
        email,
        password,
        name
    })


    if (!user) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    const Token = await generateTokenForCookie(user)

    return res.status(201).cookie("token", Token, cookieOption).json(
        new ApiResponse(201, user, "User Registered Successfully")
    )
})


const login = asyncHandler(async (req, res) => {
    const { userName, email, password } = req.body

    const obj = {}

    if (!password) {
        throw new ApiError(400, "Password is required")
    }

    if (!userName && !email) {
        throw new ApiError(400, "Username or Email is required")
    }

    if (email) obj.email = email
    if (userName) obj.userName = userName

    const user = await User.findOne(obj)


    if (!user) {
        throw new ApiError(400, "User does not exist, Invalid credentials")
    }

    const isCorreted = await user.comparePassword(password)

    if (!isCorreted) {
        throw new ApiError(401, "Wrong Password")
    }
    const Token = await generateTokenForCookie(user)


    return res.status(200).cookie("token", Token, cookieOption).json(
        new ApiResponse(200, user, "User Logged In Successfully")
    )
})

const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $unset: { token: "" }
    }, { new: true })

    return res.status(200).clearCookie("token", cookieOption).json(
        new ApiResponse(200, {}, "User Logged Out Successfully")
    )
})


const followUnfollowUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const userToFollow = await User.findById(id);
    const currentUser = await User.findById(req.user._id);

    if (!userToFollow) {
        throw new ApiError(400, "User not found")
    }

    if (id === req.user._id.toString()) {
        throw new ApiError(400, "You cannot follow/unfollow yourself")
    }

    const isFollowed = userToFollow.followers.includes(currentUser._id);

    if (isFollowed) {
        await User.findByIdAndUpdate(id, {
            $pull: { followers: currentUser._id }
        })

        await User.findByIdAndUpdate(currentUser._id, {
            $pull: { following: userToFollow._id }
        })
    }
    else {
        await User.findByIdAndUpdate(id, {
            $push: { followers: req.user._id }
        })

        await User.findByIdAndUpdate(currentUser._id, {
            $push: { following: userToFollow._id }
        })
    }

    return res.status(200).json(
        new ApiResponse(200, {}, `User ${isFollowed ? "unfollowed" : "followed"} successfully`)
    )
})

const listAllUsers = asyncHandler(async (req, res) => {
    const allUsers = await User.find()

    return res.status(200).json(
        new ApiResponse(200, allUsers, "All users fetched successfully")
    )
})

const getUserProfile = asyncHandler(async (req, res) => {
    const { userName } = req.params;


    const aggregate = await User.aggregate([
        {
            $match: { userName }
        },
        {
            $lookup: {
                from: "posts",
                localField: "_id",
                foreignField: "postedBy",
                as: "posts",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "postedBy",
                            foreignField: "_id",
                            as: "postedBy",
                            pipeline: [
                                {
                                    $project: {
                                        name: 1,
                                        userName: 1,
                                        pfp: 1,
                                        _id: 1,
                                    }
                                }
                            ]
                        },
                    },
                    {
                        $addFields: {
                            postedBy: { $first: "$postedBy" }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                followersCount: { $size: "$followers" },
                followingCount: { $size: "$following" },
                followed: {
                    $in: [new mongoose.Types.ObjectId(req.user?._id), "$followers"]
                }
            }
        }
    ])

    if (!aggregate) {
        throw new ApiError(404, "User not Found")
    }

    return res.status(200).json(
        new ApiResponse(200, aggregate, "User profile fetched successfully")
    )
})


const addingUserData = asyncHandler(async (req, res) => {
    const { name, bio, instagram } = req.body
    const user = req.user

    if (!name) {
        throw new ApiError(400, "Name is required")
    }

    user.name = name
    user.bio = bio || user.bio
    user.instagram = instagram || user.instagram

    const localPfpPath = req.file?.path

    if (localPfpPath) {
        if (!user.pfp) {
            console.log("helo")
            await deleteFile(user.pfp.filePath)
        }

        const fileUrl = await uploadFile("PFPs", localPfpPath)
        if (!fileUrl) {
            throw new ApiError(400, "Error while uploading File")
        }


        user.pfp.url = fileUrl
        user.pfp.filePath = "PFPs/" + localPfpPath
    }


    await user.save()

    return res.status(200).json(
        new ApiResponse(200, user, "User data updated successfully")
    )
})

const changeUserName = asyncHandler(async (req, res) => {
    const { userName } = req.body
    const user = req.user

    if (!userName) {
        throw new ApiError(400, "Username is required")
    }

    const existingUserName = await User.findOne({ userName })

    if (existingUserName) {
        throw new ApiError(400, "Username is taken")
    }

    user.userName = userName

    await user.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse(200, user, "Username updated successfully")
    )
})

const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const user = req.user

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "All fields are required")
    }

    const isCorrect = await user.comparePassword(oldPassword)

    if (!isCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword

    await user.save()

    return res.status(200).json(
        new ApiResponse(200, user, "Password updated successfully")
    )
})

const getLoggedInUser = asyncHandler(async (req, res) => {
    const user = req.user

    return res.status(200).json(
        new ApiResponse(200, user, "Logged in user fetched successfully")
    )
})
const userFeed = asyncHandler(async (req, res) => {
    const user = req.user;
    let feed = [];

    if (user.following && user.following.length > 0) {
        // Step 1: Fetch posts from followed users using aggregation
        const aggregate = await User.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(user._id) }
            },
            {
                $lookup: {
                    from: "posts",
                    localField: "following",
                    foreignField: "postedBy",
                    as: "feed",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "postedBy",
                                foreignField: "_id",
                                as: "user",
                                pipeline: [
                                    {
                                        $project: {
                                            name: 1,
                                            userName: 1,
                                            pfp: 1,
                                            _id: 1,
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $sort: { createdAt: -1 }
                        }
                    ]
                }
            },
            {
                $unwind: "$feed"
            },
            {
                $sort: { "feed.createdAt": -1 }
            },
            {
                $group: {
                    _id: "$_id",
                    feed: { $push: "$feed" }
                }
            }
        ]);

        feed = aggregate[0]?.feed || [];
    }

    // Step 2: Check if feed has less than 10 posts
    if (feed.length < 10) {
        const additionalPostsCount = 10 - feed.length;

        // Fetch additional posts from other users to fill up the feed
        let additionalPosts = await Post.find({
            postedBy: { $nin: user.following.concat(user._id) }  // Exclude posts by followed users and the current user
        })
            .sort({ createdAt: -1 })
            .limit(additionalPostsCount)
            .populate("postedBy", "name userName pfp _id");

        // Format additional posts to match the structure of the aggregation result
        additionalPosts = additionalPosts.map(post => ({
            ...post.toObject(),
            user: [{
                name: post.postedBy.name,
                userName: post.postedBy.userName,
                pfp: post.postedBy.pfp,
                _id: post.postedBy._id
            }]
        }));

        // Combine the feeds
        feed = feed.concat(additionalPosts);
    }

    // Step 3: Return the feed
    return res.status(200).json(
        new ApiResponse(200, feed, "User feed fetched successfully")
    );
});


const getSuggestedUsers = asyncHandler(async (req, res) => {
    const user = req.user;

    const suggestedUsers = await User.find({
        _id: { $nin: [user?._id, ...user.following] }  // Exclude the current user and followed users
    })
        .limit(5);

    return res.status(200).json(
        new ApiResponse(200, suggestedUsers, "Suggested users fetched successfully")
    );
})



export {
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
    getUserById
}