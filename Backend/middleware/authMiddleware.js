const jwt = require('jsonwebtoken')


const authMiddleware = (req, res, next) => {
    const auth_token = req.cookies?.auth_token;

    if(!auth_token) {
        return response(res, 401, 'authorization token missing. please provide authorized token');
    }

    try {
        const decode = jwt.verify(auth_token, process.env.JWT_SECRET)
        req.user = decode;
        console.log(req.user);
        next();
    } catch (e) {
        console.error(e);
        return response(res, 401, "Invalid or expired Token");
    }
}

module.exports = authMiddleware;