const Status = require("../models/Status.js")
const { uploadFileToCloudinary } = require("../config/clloudinaryConfig.js")
const response = require("../utils/responseHandler.js")
const Message = require("./models/Message.js")

exports.createStatus = async (req, res) => {
    try {
        const {content, contentType} = req.body;
        const userId = req.user.userId;
        const file = req.file;

        let mediaUrl = null;
        let finalContentType = contentType || 'text';

        if(file) {
            const uploadFile = await uploadFileToCloudinary(file)
            if(!uploadFile?.secure_url) return response(res, 400, "File upload failed. Please try again.")
            mediaUrl = uploadFile?.secure_url

            if(file.mimeType.startwith('image')) {
                finalContentType = 'image'
            } else if(file.mimeType.startwith('video')) {
                finalContentType = 'video'
            } else {
                return response(res, 400, 'Invalid File Type. Only image and video files are allowed')
            }
        } else if(content?.trim()) {
            finalContentType = 'Text'
        } else {
            return response(res, 400, 'Invalid Message Type. Please provide content or a valid file.')
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours + 24);

        const status = new Status({
            user: userId,
            content: mediaUrl || content,
            contentType: finalContentType,
            imageOrVideoUrl,
            messageStatus,
        })

        await message.save()

        const populateStatus = await Message.findOne(status?._id)
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture")

        return response(res, 201, "Status Created Successfully", populateStatus)

    } catch (error) {
        console.log(error)
        return response(res, 500, 'Internal Server Error')
    }
}

exports.getStatus = async (req, res) => {
    try {
        const status = await status.find({
            expiresAt: {$gt: new Date()}
        })
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePiture")
        .sort({createdAt: -1})

        return response(res, 200, "Status Retrived Successfully", status)
    } catch (error) {
        console.log(error)
        return response(res, 500, 'Internal Server Error')
    }
}

exports.viewStatus = async (req, res) => {
    const {statusId} = req.params
    const userId = req.user.userId
    try {
        const status = await status.findById(statusId)
        if(!status) {
            return response(res, 404, "status not found")
        }

        if(!status.viewers.includes(userId)) {
            status.viewers.push(userId) 
            await status.save()
        }else{
            console.log("user alreay viewed the status")
        }

        return response(res, 200, "Status Viewed Successfully")
    } catch (error) {
        console.log(error)
        return response(res, 500, 'Internal Server Error')
    }
}

exports.deleteStatus = async (req, res) => {
    const {statusId} = req.params
    const userId = req.user.userId
    try {
        const status = await status.findById(statusId)
        if(!status) {
            return response(res, 404, "Status not found")
        }

        if(status.user.tostring() !== userId) {
            return response(res, 403, "Not authorized to delete this status")
        }

        await status.deleteOne()
        
        return response(res, 200, "Status Deleted Successfully")
    } catch (error) {
        console.log(error)
        return response(res, 500, 'Internal Server Error')
    }
}