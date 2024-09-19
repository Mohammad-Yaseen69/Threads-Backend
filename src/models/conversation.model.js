import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    lastMessage: {
        text: String,
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
    },
    isAllowed: {
        type: Boolean,
        default: true
    },
    isFirstMessage: {
        type: Boolean,
        default: false
    }
},{timestamps: true})

export const Conversation = mongoose.model("Conversation", conversationSchema);