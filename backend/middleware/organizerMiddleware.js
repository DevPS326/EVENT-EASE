exports.isOrganizer = async (req, res, next) => {
    if (req.user && (req.user.role === 'organizer' || req.user.role === 'admin')) {
        return next();
    }
    return res.status(403).json({ message: 'Access denied. Organizer role required.' });
};

exports.isAdmin = async (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
};