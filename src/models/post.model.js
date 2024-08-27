import mongoose from 'mongoose'


const replies = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pfp: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true })

const postSchema = new mongoose.Schema({
    postTitle: {
        type: String,
        required: true
    },

    postImg: String,

    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    replies: [replies]
}, {timestamps: true})


export const Post = mongoose.model('Post', postSchema)