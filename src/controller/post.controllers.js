import { User } from "../models/user.model.js"
import { Post } from "../models/post.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFile, uploadFile } from "../utils/firebaseHelpers.js"
import fs from "fs"
import mongoose from "mongoose"

const createPost = asyncHandler(async (req, res) => {
    const { postTitle } = req.body

    if (!postTitle) {
        throw new ApiError(400, "Post title is required")
    }

    const obj = {
        postTitle,
        postedBy: req.user?._id,
    }

    const postImgPath = req.file?.path

    if (postImgPath) {
        const uploading = await uploadFile("Posts", postImgPath)

        if (!uploading) {
            throw new ApiError(400, "Error while uploading file");
        }

        obj.postImg = {
            url: uploading,
            filePath: "Posts/" + postImgPath
        }
    }

    const post = await Post.create(obj)

    if (!post) throw new ApiError(400, "Error while creating Post")

    return res.status(201).json(
        new ApiResponse(201, post, "Post created successfully")
    )
})


const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params

    const post = await Post.findById(postId)

    if (!post) throw new ApiError(404, "Post not found")

    if (post.postImg.filePath) {
        await deleteFile(post.postImg.filePath)
    }

    await Post.findByIdAndDelete(postId)

    return res.status(200).json(
        new ApiResponse(200, {}, "Post deleted successfully")
    )
})


const getAllPosts = asyncHandler(async (req, res) => {
    const posts = await Post.find()

    return res.status(200).json(
        new ApiResponse(200, posts, "Posts fetched successfully")
    )
})

const getPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.user?._id); // The logged-in user's ID

    const aggregate = await Post.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(postId) }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                repliesCount: { $size: "$replies" },
                likedByMe: { $in: [userId, "$likes"] }
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "postedBy",
                foreignField: "_id",
                as: "postedBy",
                pipeline: [
                    {
                        $project: {
                            userName: 1,
                            pfp: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                replies: {
                    $map: {
                        input: "$replies",
                        as: "reply",
                        in: {
                            _id: "$$reply._id",
                            text: "$$reply.text",
                            userId: "$$reply.userId",
                            pfp: "$$reply.pfp",
                            userName: "$$reply.userName",
                            likes: "$$reply.likes",
                            likesCount: { $size: "$$reply.likes" },
                            createdAt: "$$reply.createdAt",
                            isUserReply: { $eq: ["$$reply.userId", userId] } // Check if reply is from logged-in user
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                replies: {
                    $sortArray: {
                        input: "$replies",
                        sortBy: {
                            isUserReply: -1, // First sort: logged-in user's replies
                            likesCount: -1   // Second sort: by likes count
                        }
                    }
                }
            }
        },
        {
            $project: {
                postTitle: 1,
                postedBy: 1,
                postImg: 1,
                likes: 1,
                date: 1,
                replies: 1,
                likedByMe: 1,
                createdAt: 1,
                likesCount: 1,
                repliesCount: 1,
            }
        }
    ]);

    if (!aggregate) throw new ApiError(404, "Post not found");

    return res.status(200).json(
        new ApiResponse(200, aggregate, "Post fetched successfully")
    );
});


const likeToggle = asyncHandler(async (req, res) => {
    const { postId } = req.params
    const post = await Post.findById(postId)
    const user = req.user

    if (!post) throw new ApiError(404, "Post not found")

    const isLiked = post.likes.includes(user._id)
    if (isLiked) {
        await Post.findByIdAndUpdate(postId, {
            $pull: { likes: user._id }
        })
    }
    else {
        await Post.findByIdAndUpdate(postId, {
            $push: { likes: user._id }
        })
    }

    return res.status(200).json(
        new ApiResponse(200, null, `Post ${isLiked ? "unliked" : "liked"}  successfully`)
    )
})

const addReply = asyncHandler(async (req, res) => {
    const { postId } = req.params
    const { text } = req.body
    const user = req.user

    if (!text) throw new ApiError(400, "Reply text is required")

    const post = await Post.findById(postId)

    if (!post) throw new ApiError(404, "Post not found")

    const reply = {
        text,
        userId: user._id,
        pfp: user.pfp.url,
        userName: user.userName,
    }

    post.replies.push(reply)

    await post.save()

    const createdReply = post.replies[post.replies.length - 1];

    return res.status(200).json(
        new ApiResponse(200, createdReply, "Reply added successfully")
    )
})

const deleteReply = asyncHandler(async (req, res) => {
    const { postId, replyId } = req.params
    const user = req.user

    const post = await Post.findById(postId)

    if (!post) throw new ApiError(404, "Post not found")

    const reply = post.replies.find(reply => reply._id.toString() === replyId)

    if (!reply) throw new ApiError(404, "Reply not found")

    if (reply.userId.toString() !== user._id.toString()) throw new ApiError(403, "You are not authorized to delete this reply")

    post.replies = post.replies.filter(reply => reply._id.toString() !== replyId)

    await post.save()

    return res.status(200).json(
        new ApiResponse(200, post, "Reply deleted successfully")
    )
})

const likeReply = asyncHandler(async (req, res) => {
    const { postId, replyId } = req.params
    const user = req.user

    const post = await Post.findById(postId)

    if (!post) throw new ApiError(404, "Post not found")

    const reply = post.replies.find(reply => reply._id.toString() === replyId)

    if (!reply) throw new ApiError(400, "Reply not found")

    const alreadyLiked = reply.likes.includes(user._id.toString())


    if (alreadyLiked) {
        reply.likes = reply.likes.filter(like => like.toString() !== user._id.toString())
    } else {
        reply.likes.push(user._id)
    }


    await post.save()

    return res.status(200).json(
        new ApiResponse(200, null, `Reply ${alreadyLiked ? "unliked" : "liked"} successfully`)
    )
})

export {
    createPost,
    deletePost,
    getPost,
    getAllPosts,
    likeToggle,
    addReply,
    deleteReply,
    likeReply
}