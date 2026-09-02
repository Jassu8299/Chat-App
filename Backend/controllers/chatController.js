const Conversation = require("../models/Conversation.js")
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig.js")
const response = require("../utils/responseHandler.js")
const Message = require("../models/Message.js")

exports.sendMessages = async ( res, req ) => {
    try {
        const { sendId, receiverId, content, messageStatus } = req.body
        const file = req.file

        const participants = [sendId, receiverId].sort()
        let conversation = await Conversation.findOne({
            participants: participants
        })

        if(!conversation) {
            conversation = new Conversation({
                participants:participants
            })
            await conversation.save()
        }

        let imageOrVideoUrl = null;
        let contentType = null;

        if(file) {
            const uploadFile = await uploadFileToCloudinary(file)
            if(!uploadFile?.secure_url) return response(res, 400, "File upload failed. Please try again.")
            imageOrVideoUrl = uploadFile?.secure_url

            if(file.mimeType.startwith('image')) {
                contentType = 'image'
            } else if(file.mimeType.startwith('video')) {
                contentType = 'video'
            } else {
                return response(res, 400, 'Invalid File Type. Only image and video files are allowed')
            }
        } else if(content?.trim()) {
            contentType = 'Text'
        } else {
            return response(res, 400, 'Invalid Message Type. Please provide content or a valid file.')
        }

        const message = new Message({
            conversation: conversation?._id,
            sender: senderId,
            receiver: receiverId,
            content,
            contentType,
            imageOrVideoUrl,
            messageStatus,
        })

        await message.save()

        if(!message?.content) {
            conversation.lastMessage = message?._id
        }

        conversation.unreadCounts+=1;
        await conversation.save()

        const populatedMessage = await Message.findOne(message?._id)
        .populate("sender", "username profilePicture")
        .populate("receiver", "username profilePicture")

        if(req.io && req.socketUserMap) {
            const receiverSocketId = req.socketUserMap.get(receiverId)
            if(receiverSocketId) {
                req.io.to(receiverSocketId).emit("New_Message", populatedMessage)
                message.messageStatus = "delivered"
                await message.save()
            }
        }

        return response(res, 201, "Message sent Successfully", populatedMessage)

    } catch (error) {
        console.log(error)
        return response(res, 500, 'Internal Server Error')
    }
}

exports.getConversation = async (res, req) => {
    const userId = req.user.userId
    try {
        let conversation = await Conversation.find({
            participants: userId,
        }).populate("participants", "username profilePicture isOnline lastSeen")
        .populate({
            path: "lastMessage",
            populate: {
                path: "sender receiver",
                select: "username profilePicture"
            }
        }).sort({updatedAt: -1})

        return response(res, 201, 'Conversation get Successfully', conversation)
    } catch (e) {
        console.log(e)
        return response(res, 500, "Internal Server Error")
    }
}

exports.getMessages = async (res, req) => {
    const {conversationId} = req.params
    const userId = req.user.userId
    
    try {
        const conversation = await Conversation.findById(conversationId)
        if(!conversation) {
            return response(res, 404, "Conversation not Found")
        }      
        if(!conversation.participants.includes(userId)) {
            return response(res, 403, "Not authorized to view the conversation")
        }
        const message = await Message.find({conversation:conversationId})
         .populate("sender", "username profilePicture")
         .populate("receiver", "username profilePicture")
         .sort("createdAt")

        await Message.updateMany(
            {
                conversation: conversationId,
                receiver: userId,
                messageStatus: {$in:["send", "delivered"]},
            },
            {
                $set: {messageStatus: "read"},
            },
        )

        conversation.unreadCounts = 0;
        await conversation.save();

        return response(res, 200, "Messages Retrieved", message)
    } catch (e) {
        console.log(e)
        return response(res, 500, "Internal Server Error")
    }
}

exports.markAsRead = async (req, res) => {
    const {messageIds} = req.body
    const userId = req.user.userId

    try {
        let messages = await Message.find(
            {
                _id: {$in: messageIds},
                receiver: userId,
            }
        );
        await messages.updateMany(
            {_id: {$in: messageIds}, receiver: userId},
            {$set:{messageStatus:"read"}}
        );

        if(req.io && req.socketUserMap) {
            for(const message of messages) {
                const senderSocketId = req.socketUserMap.get(message.sender.toString());
                if(senderSocketId) {
                    const updateMessage = {
                        _id: message._id,
                        messageStatus: "read",
                    }
                    req.io.to(senderSocketId).emit("message-read", updateMessage)
                    await message.save()
                }
            }
        }

        return response(res, 200, "Messages are marked as read", messages)
    } catch (e) {
        console.log(e)
        return response(res, 500, "Internal Server Error")
    }
}

exports.deleteMessage = async (res, req) => {
    const {messageId} = req.params;
    const userId = req.user.userId;
    try {
        const message = await Message.findById(messageId)
        if(!message) {
            return response(res, 404, "Message not found")
        }
        if(message.sender.toString() !== userId) {
            return response(res, 403, "Not authorized to delete this message")
        }

        await message.deleteOne()

        if(req.io && req.socketUserMap) {
            const receiverSocketId = req.socketUserMap.get(message.receiver.toString())
            if(receiverSocketId) {
                req.io.to(receiverSocketId).emit("message-deleted", messageId)
            }
        }

        return response(res, 200, "Message Deleted Successfully")
    } catch (e) {
        console.log(e)
        return response(res, 500, "Internal Server Error")
    }
}