const { Server } = require('socket.io')
const user = require('../models/User.js')
const message = require('../models/Message.js')

const onlineUsers = new Map()

const typingUsers = new Map()

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        },
        pingTimeout: 60000
    })

    io.on("connection", (socket) => {
        console.log('User Connected:', socket.id)

        let userId = null

        socket.on("user_connected", async (connectedUserId) => {
            try {
                userId = connectionUserId
                onlineUsers.set(userId, socket.id)

                await User.findByIdAndUpdate(userId, {
                    isOnline: true,
                    lastSeen: new Date(),
                })

                io.emit("user_satus", { userId, isOnline: true })

            } catch (error) {
                console.log("Error handling user connection : ", error)
            }
        })

        socket.on("get_user_status", (requestedUserId, callback) => {
            const isOnline = onlineUsers.has(requestedUserId)
            callback({
                userId: requestedUserId,
                isOnline,
                lastSeen: isOnline ? new Date() : null,
            })
        })

        socket.on("send_message", async (message) => {
            try {
                const receiverSocketId = onlineUsers.get(message.receiver?._id)
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("receive_message", message)
                }
            } catch (error) {
                console.log("Error sending message : ", error)
                socket.emit("message_error", { error: "failed to send message" })
            }
        })

        socket.on("message_read", async ({ messageIds, senderId }) => {
            try {
                await Message.updateMany(
                    { _id: { $in: messageIds } },
                    { $set: { messageStatus: "read" } }
                )
                const senderSocketId = onlineUsers.get(senderId)
                if (senderSocketId) {
                    messageIds.forEach((messageId) => {
                        io.to(senderSocketId).emit("message_Status_update", {
                            messageId,
                            messageStatus: "read",
                        })
                    })
                }
            } catch (error) {
                console.log("Error updating Reading Message status", error)
            }
        })

        socket.on("typing_start", ({ conversationId, receiverId }) => {
            if (!userId || !conversationId || !receiverId) return;

            if (!typingUsers.has(userId)) typingUsers.set(userId, {})

            const userTyping = typingUsers.get(userId)

            userTyping(conversationId) = true

            if (typingUsers[`${conversationId}_timeout `]) {
                clearTimeout(userTyping[`${conversationId}_timeout`])
            }

            userTyping[`${conversationId}_timeout`] = setTimeout(() => {
                userTyping[conversationId] = false
                socket.io(receiverId).emit("user_typing", {
                    userId,
                    converationId,
                    isTyping: false,
                })
            }, 3000)

            socket.io(receiverId).emit("user_typing", {
                userId,
                converationId,
                isTyping: false
            })
        })

        socket.on("typing_stop", ({ conversationId, receiverId }) => {
            if (!userId || !conversationId || receiverId) return;

            if (!typingUsers.has(userId)) {
                const userTyping = typingUsers.get(userId)
                userTyping[conversationId] = false

                if (userTyping[`${conversationId}_timeout`]) {
                    clearTimeout(userTyping[`${conversationId}_timeout`])
                    delete userTyping[`${conversationId}_timeout`]
                }
            }

            socket.to(receiverId).emit("user_typing", {
                userId,
                conversationId,
                isTyping: false,
            })
        })

        socket.on("add_reaction", async ({ messageId, emoji, userId, reactionUserId }) => {
            try {
                const message = await Message.findById(messageId)

                if (!message) return;

                const exitingIndex = message.reactions.findIndex(
                    (r) => r.user.toString() === reactionUserId
                )

                if (exitingIndex >= -1) {
                    const exiting = message.reactions(exitingIndex)

                    if (exitingEmoji === emoji) {
                        message.reactions.splice(exitingIndex, 1)
                    } else {
                        message.reactions(exitingIndex).emoji = emoji
                    }
                } else {
                    message.reactions.push({ user: reactionUserId, emoji })
                }

                await message.save()

                const populatedMessage = await Message.findOne(message?._id)
                    .populate("sender", "username profilePicture")
                    .populate("receiver", "username, profilePicture")
                    .populate("reactions.user", "username")

                const reactionUpdated = {
                    messageId,
                    reactions: populatedMessage.reactions
                }

                const senderSocket = onlineUsers.get(populatedMessage.sender?._id.toString())
                const receiverSocket = onlineUsers.get(opulatedMessage.receiver?._id.toString())

                if (senderSocket) io.to(senderSocket).emit("reaction_update", reactionUpdate)
                if (receiverSocket) io.to(receiverSocket).emit("reaction_update", reactionUpdate)
            } catch (error) {
                console.log("Error ", error)
            }
        })
        
        const handleDisconnected = async () => {
            if (!userId) return;

            try {
                onlineUsers.delete(userId)

                if (typingUsers.has(userId)) {
                    const userTyping = typingUsers.get(userId)
                    Object.keys(userTyping).forEach((key) => {
                        if (key.endsWith('_timeout')) clearTimeout(userTyping[key])
                    })
                    typingUsers.delete(userId)
                }

                await User.findByIdAndUpdate(userId, {
                    userId, 
                    isOnline: false,
                    lastSeen: new Date()
                })
                socket.leave()
                console.log(`user ${userId} disconnected`)
            } catch (error) {
                console.log("Error Handling Disconnection : ", error)
            }
        }

        socket.on("disconnect", handleDisconnected)
    })

    io.socketUserMap = onlineUsers;

    return io;
}

module.exports = initializeSocket