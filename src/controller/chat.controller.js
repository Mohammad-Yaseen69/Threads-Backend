import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Conversation } from '../models/conversation.model.js'
import { Message } from "../models/message.model.js"


const sendMessage = asyncHandler(async (req, res) => {
    const { message } = req.body
    const { id: receiverId } = req.params
    const user = req.user._id
    let conversation = null

    if (!message) {
        throw new ApiError(400, "Message is required")
    }

    conversation = await Conversation.findOne({
        participants: { $all: [user, receiverId] }
    })

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [user, receiverId],
            lastMessage: {
                text: message,
                sender: user,
            },
            isAllowed: false
        })

        if (!conversation) {
            throw new ApiError(400, "Error creatin  g conversation please try again")
        }

        await conversation.save()

        const newMessage = await Message.create({
            sender: user,
            text: message,
            conversation: conversation._id
        })

        return res.status(200).json(
            new ApiResponse(200, newMessage, "You can't send more messages until this user allowed you")
        )
    }


    if (conversation.isAllowed === false) {
        throw new ApiError(400, "This user haven't allow you to send messages")
    }


    const newMessage = await Message.create({
        sender: user,
        text: message,
        conversation: conversation._id
    })

    if (!newMessage) {
        throw new ApiError(400, "Error while sending message please try again")
    }

    conversation.lastMessage = {
        text: message,
        sender: user
    }

    await conversation.save()


    res.status(200).json(
        new ApiResponse(200, newMessage, "Message sent successfully")
    )
})

const getMessages = asyncHandler(async (req, res) => {
    const { id: conversationId } = req.params; // Use conversationId here

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
        throw new ApiError(404, "Conversation not found");
    }

    const user = req.user._id;
    if (!conversation.participants.includes(user)) {
        throw new ApiError(403, "You are not authorized to view these messages");
    }

    // Get messages by conversationId
    const messages = await Message.find({ conversation: conversationId });

    if (!messages) {
        throw new ApiError(404, "No messages found");
    }

    res.status(200).json(
        new ApiResponse(200, messages, "Messages fetched successfully")
    );
});


const getConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const conversations = await Conversation.aggregate([
        // Match conversations where the logged-in user is one of the participants
        {
            $match: {
                participants: userId,
            },
        },
        // Exclude conversations where the other participant is the logged-in user
        {
            $addFields: {
                otherParticipant: {
                    $filter: {
                        input: '$participants',
                        as: 'participant',
                        cond: { $ne: ['$$participant', userId] },
                    },
                },
            },
        },
        {
            $match: {
                otherParticipant: { $ne: [] },
            },
        },
        // Populate participant details
        {
            $lookup: {
                from: 'users',
                localField: 'otherParticipant',
                foreignField: '_id',
                as: 'participantsInfo',
            },
        },
        {
            $unwind: {
                path: '$participantsInfo',
                preserveNullAndEmptyArrays: true,
            },
        },
        // Project fields as needed
        {
            $project: {
                _id: 1,
                participants: 1,
                lastMessage: 1,
                'participantsInfo.name': 1,
                'participantsInfo.pfp': 1,
                'participantsInfo._id': 1,
            },
        },
    ]);

    if (!conversations || conversations.length === 0) {
        throw new ApiError(404, "No conversations");
    }

    res.status(200).json(
        new ApiResponse(200, conversations, "Conversations fetched successfully")
    );
});

const deleteMessage = asyncHandler(async (req, res) => {
    const user = req.user._id
    const { id: messageId } = req.params

    const conversation = await Conversation.findOne({ participants: user })
    if (!conversation) {
        throw new ApiError(404, "Conversation not found")
    }

    const message = await Message.findOne({ _id: messageId });

    if (!message || user.toString() !== message.sender.toString()) {
        throw new ApiError(400, "You can't delete other users' messages");
    }

    await Message.findOneAndDelete({ _id: messageId, sender: user });

    res.status(200).json(
        new ApiResponse(200, {}, "Message deleted successfully")
    )
})

const deleteConversation = asyncHandler(async (req, res) => {
    const user = req.user._id
    const { id: conversationId } = req.params

    const conversation = await Conversation.findOneAndDelete({
        _id: conversationId,
        participants: user
    })

    if (!conversation) {
        throw new ApiError(404, "Conversation not found")
    }

    res.status(200).json(
        new ApiResponse(200, {}, "Conversation deleted successfully")
    )
})

const allowUserToChat = asyncHandler(async (req, res) => {
    const user = req.user._id
    const { id: conversationId } = req.params

    const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: user
    })

    if (!conversation) {
        throw new ApiError(404, "Conversation not found")
    }

    conversation.isAllowed = true

    await conversation.save()

    res.status(200).json(
        new ApiResponse(200, {}, "Conversation allowed successfully")
    )
})

const getOrCreateConversation = asyncHandler(async (req, res) => {
    const { id: receiverId } = req.params;  // This is the ID of the other user (e.g., Yaseen)
    const userId = req.user._id;  // This is the current logged-in user (e.g., Toji)

    // Find a conversation where both users are participants, no matter the order
    let conversation = await Conversation.findOne({
        participants: { $all: [userId, receiverId] }  // $all matches both users in any order
    });

    // If the conversation exists, return it
    if (conversation) {
        return res.status(200).json({
            success: true,
            conversationId: conversation._id
        });
    }

    // If no conversation exists, create a new one
    conversation = new Conversation({
        participants: [userId, receiverId],
        lastMessage: {
            text: "",
            sender: userId,
        },
        isAllowed: false
    });

    await conversation.save();

    return res.status(201).json({
        success: true,
        conversationId: conversation._id
    });
});


export {
    sendMessage,
    getMessages,
    getConversations,
    deleteMessage,
    deleteConversation,
    allowUserToChat,
    getOrCreateConversation
}