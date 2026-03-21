import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.sendError(401, 'ERR_UNAUTHORIZED', 'Not authorized to access this route');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.sendError(401, 'ERR_UNAUTHORIZED', 'Token failed or expired');
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.sendError(403, 'ERR_FORBIDDEN', 'User role is not authorized to access this route');
        }
        next();
    };
};
