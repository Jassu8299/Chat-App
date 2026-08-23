const Twilio = require('twilio')

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const serviceSid = process.env.TWILIO_SERVICE_SID
const client = Twilio(accountSid, authToken)

const sendOTP = async (phoneNumber) => {
    try {
        console.log('sending OTP to this number:', phoneNumber)
        const response = await client.verify.services(serviceSid)
            .verifications
            .create({ to: phoneNumber, channel: 'sms' });
            console.log('OTP sent response:', response)
        return response
    } catch (error) {
        console.log(error)
        throw new Error('Failed to send OTP')
    }
}

const verifyOTP = async (phoneNumber, otp) => {
    try {
        console.log("This is my OTP:", otp)
        console.log("This is my PhoneNumber:", phoneNumber)
        const response = await client.verify.services(serviceSid).verifications.create({
            to:phoneNumber,
            channel: 'sms'
        })
        console.log('Verification response:', response)
        return response
    } catch (error) {
        console.log(error)
        throw new Error('Failed to verify OTP')
    }
}

module.exports = { sendOTP, verifyOTP }