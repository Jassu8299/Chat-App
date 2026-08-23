const otpGenerate = require("../utils/otpGenerator.js");
const User = require('../models/User.js');
const response = require('../utils/responseHandler.js');
const sendOtpToEmail = require('../services/emailService.js');
const twilioService = require("../services/twilioService.js");
const generateToken = require('../utils/generateToken.js');
const { uploadFileToCloudinary } = require('../config/cloudinaryConfig.js');
const Conversation = require("../models/Conversation.js");

const sendOtp = async(req, res) => {
    const { phoneNumber, phoneSuffix, email } = req.body;
    const otp = otpGenerate();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    let user;
    try {
        if(email) {
            user = await User.findOne({email})

            if(!user) {
                user = new User({email})
            }
            user.emailOtp = otp;
            user.emailOtpExpiry = expiry;
            await user.save();
            await sendOtpToEmail(email, otp);
            return response(res, 200, 'OTP sent to email', {email});
        }
        if(!phoneNumber || !phoneSuffix) {
                return response(res, 400, 'Phone number and suffix are required');
        }
        const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
        user = await User.findOne({phoneNumber: fullPhoneNumber});

        if(!user) {
            user = await new User({phoneNumber, phoneSuffix})
        }
        await twilioService.sendOTP(fullPhoneNumber)
        await user.save();
        return response(res, 200, 'OTP sent Successfully');
    } catch (error) {
        console.log("Error sending OTP", error);
        return response(res, 500, "Internal server error");
    }
}

const verifyOtp = async(req, res) => {
    const { phoneNumber, phoneSuffix, email, otp } = req.body
    try{
        let user;
        if(email) {
            user = await User.findOne({email});
            if(!user) {
                return response(res, 404, 'user not found')
            }
            const now = new Date();
            if(user.emailOtp !== otp || String(user.emailOtp)!== String(otp) || new Date(user.emailOtpExpiry) < now) {
                return response(res, 400, 'Invalid or expired OTP')
            }

            user.isVerified = true;
            user.emailOtp=null;
            user.emailOtpExpiry = null;
            await user.save();
        } else {
            if(!phoneNumber || !phoneSuffix) {
                return response(res, 400, 'Phone Number and Suffix are required')
            }
            const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
            user = await User.findOne({phoneNumber})
            if(!user) {
                return response(res, 400, 'User not Found')
            }
            const result = await twilioService.verifyOTP(fullPhoneNumber, otp)
            if(result.status !== 'approved') {
                return response(res, 400, 'Invalid Otp')
            }
            user.isVerified = true;
            await user.save();
        }
        const token = generateToken(user?._id)
        res.cookie("auth_token", token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365,
        })
        return response(res, 200, 'OTP verified Successfully', {token})
    } catch (error) {
        console.log("error", error)
        return response(res, 500, 'Internal Server Error')
    }
}

const updateProfile = async(req, res) => {
    const { username, agreed, about} = req.body
    const userId = req.user.userId
    try {
        const user = await User.findById(userId)
        const file = req.file
        if(file) {
            const uploadResult = await uploadFileToCloudinary(file)
            console.log("uploadResult", uploadResult)
            user.profilePicture = uploadResult?.secure_url;
        } else if(req.body.profilePicture) {
            user.profilePicture = req.body.profilePicture;
        }

        if(username) user.username = username;
        if(agreed) user.ageed = agreed;
        if(about) user.about = about;
        await user.save();
        
        return response(res, 200, 'Profile updated Successfully', user)
    } catch(error) {
        console.log(error)
        return response(res, 500, 'Internal Server Error')
    }
}

const checkAuthenticated = async(req, res) => {
    try {
        const userid = req.user.userId;
    if(!userId) {
        return response(res, 401, 'Unauthorized. please login again')
    }
    const user = await User.findById(userId)
    if(user) {
        return response(res, 200, 'User is authorized', user)
    }
    return response(res, 401, 'User not found')
    }
    catch (e) {
        console.log(error);
        return response(res, 500, 'Internal server error')
    }
}

const logout = async(req, res) => {
    try {
        res.cookie("auth_token", "", {expires: new Date(0)})
        return response(res, 200, 'Logged out successfully')
    } catch (error) {
        console.log(error)
        return response(res, 500, 'Internal Server Error')
    }
}

const getAllUsers = async(req, res) => {
    const loggedInUser = req.user.userId;
    try {
        const users = await User.find({_id: {$ne: loggedInUser}}).select(
            "Username lastseen profilePicture isOnline about phoneNumber phoneSuffix"
        )
        const userWithConversation = await Promise.all(
            users.map(async (user) => {
                const conversation = await Conversation.findOne({
                    participants: {$all: [loggedInUser, user?._id]}
                }).populate({
                    path: "Last Message",
                    select: "content createdAt sender receiver"
                }).lean()
                return {
                    ...user,
                    conversation: conversation || null
                }
            })
        )
        return response(res, 200, "Users info retrieved Succesfully", userWithConversation)
    } catch (error) {
        console.log(error)
        return response(res, 500, 'Internal Server Error')
    }
}

module.exports = { sendOtp, verifyOtp, updateProfile, logout, checkAuthenticated, getAllUsers }

