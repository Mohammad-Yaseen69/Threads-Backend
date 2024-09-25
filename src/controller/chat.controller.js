import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Conversation } from '../models/conversation.model.js'
import { Message } from "../models/message.model.js"
import { getSocketId } from "../socket/socket.js"
import { io } from "../socket/socket.js"
import { text } from "express"


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

    if (conversation.isFirstMessage) {
        conversation.isAllowed = false
        conversation.isFirstMessage = false


        if (!conversation) {
            throw new ApiError(400, "Error creating conversation please try again")
        }

        await conversation.save()

        const newMessage = await Message.create({
            sender: user,
            text: message,
            conversation: conversation._id
        })

        conversation.lastMessage = {
            sender: user,
            text: message
        }


        await conversation.save()

        const socketIdOfUser = getSocketId(receiverId)

        console.log(socketIdOfUser)



        // Reciever User Document should be current logged in user

        const receiverUser = await User.findById(user)

        const conversationModifiedObject = {
            lastMessage: conversation.lastMessage,
            _id : conversation._id,
            participants: conversation.participants,
            participantsInfo: {
                name: receiverUser.name,
                pfp: receiverUser.pfp,
                _id: receiverUser._id
            }
        }

        io.to(socketIdOfUser).emit("newConversation", conversationModifiedObject)

        return res.status(200).json(
            new ApiResponse(200, { messageData: newMessage, isAllowed: false }, "You can't send more messages until this user allowed you")
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

    const socketIdOfUser = getSocketId(receiverId);
    console.log('Socket ID for Receiver:', socketIdOfUser);
    io.to(socketIdOfUser).emit("newMessage", newMessage);

    res.status(200).json(
        new ApiResponse(200, { messageData: newMessage }, "Message sent successfully")
    )
})

const getMessages = asyncHandler(async (req, res) => {
    const { id: conversationId } = req.params;  // The conversation ID
    const userId = req.user._id;  // The current logged-in user

    // Check if the conversation exists and if the user is a participant
    const conversationExists = await Conversation.findById(conversationId);

    if (!conversationExists) {
        throw new ApiError(404, "Conversation not found");
    }

    // Ensure the user is a participant in the conversation
    if (!conversationExists.participants.includes(userId)) {
        throw new ApiError(403, "You are not authorized to view these messages");
    }

    // Find the other participant (the user who isn't the logged-in user)
    const otherUserId = conversationExists.participants.find(participant => !participant.equals(userId));

    // Fetch the other user's info
    const otherUser = await User.findById(otherUserId).select('name userName pfp');  // You can modify the fields you need

    // Get the messages by conversationId
    const messages = await Message.find({ conversation: conversationId });

    if (!messages) {
        throw new ApiError(404, "No messages found");
    }

    // Return the messages and other user's info
    res.status(200).json(
        new ApiResponse(200, {
            conversation: {
                otherUser,  // Add the other user's info
                conversationId: conversationExists._id,
                isAllowed: conversationExists.isAllowed,
                _id: conversationExists._id
            },
            messages
        }, "Messages fetched successfully")
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
        {
            $sort: {
                updatedAt: -1
            }
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

    io.emit("messageDeleted", { messageId, conversationId: conversation._id });

    const allMessages = await Message.find({ conversation: conversation._id });


    const lastMessage = allMessages[allMessages.length - 1] ? allMessages[allMessages.length - 1] : allMessages[allMessages.length - 2];

    await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: {
            text: lastMessage ? lastMessage.text : "",
            sender: lastMessage ? lastMessage.sender : ""
        }
    })
    // Conversation.lastMessage = 

    res.status(200).json(
        new ApiResponse(200, {}, "Message deleted successfully")
    )
})

const deleteConversation = asyncHandler(async (req, res) => {
    const user = req.user._id
    const { id: conversationId } = req.params

    const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: user
    })

    if (!conversation) {
        throw new ApiError(404, "Conversation not found")
    }

    await Conversation.findOneAndDelete({
        _id: conversationId,
        participants: user
    })

    const otherUserId = conversation.participants.find(participant => !participant.equals(user));

    const socketIdOfUser = getSocketId(otherUserId)

    io.to(socketIdOfUser).emit("conversationDeleted", conversationId);

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



    io.emit("conversationAllowed", conversationId);


    return res.status(200).json(
        new ApiResponse(200, {}, "Conversation allowed successfully")
    )
})

const canAllow = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id: conversationId } = req.params;

    let canAllow = false;

    // Find the conversation where the user is a participant
    const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
    });

    // If the conversation exists and the user is the second participant (index 1)
    if (conversation && conversation.participants[1].equals(userId)) {
        canAllow = true;  // Allow access if the user is the second participant
    }

    return res.status(200).json(
        new ApiResponse(200, { canAllow })
    );
});


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
        isFirstMessage: true
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
    getOrCreateConversation,
    canAllow
}