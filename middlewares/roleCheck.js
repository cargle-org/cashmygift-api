const authorize = (... roles) => {
    return (req, res, next) => { 
        console.log("User role: ", req.user);
        if (!roles.includes(req.user?.role)) {
            return res.status(401).send("Unauthorized Access");
        }
        next();
    };
}

module.exports = {authorize};