// Example middleware to use after implementing login sessions.
function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }
    next();
}
function requireLogin(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }
    next();
}

function requireRole(role) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.redirect('/login');
        }

        if (req.session.user.role !== role) {
            return res.status(403).send('You are not allowed to open this page.');
        }

        next();
    };
}

module.exports = { requireLogin, requireRole };
module.exports = { requireLogin };
