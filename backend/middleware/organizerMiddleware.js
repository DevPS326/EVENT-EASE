exports.isOrganizer = async (req, res, next) => {
    if (req.user && req.user.role === 'organizer') {
        return next();
    }
    // 403 means "The server understands the request but refuses to authorize it."
    return res.status(403).json({ message: 'Access denied. Organizer role required.' });
};