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

    postImg: {
        url: String,
        filePath: String,
    },

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