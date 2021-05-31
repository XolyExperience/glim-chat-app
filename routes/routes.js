const express = require('express');
const router = express.Router();
const User = require('../models/user');
const passport = require('passport');
const bcrypt = require('bcrypt');

// ROUTES
router.get('/', isLoggedIn, (req, res) => {
    res.render('index', {
        title: 'Glim Chat',
        layout: 'chat',
        user: req.user.name,
    });
});

router.get('/about', (req, res) => {
    res.render('index', { title: 'About' });
});

router.get('/login', isLoggedOut, (req, res) => {
    const response = {
        title: 'Login',
        error: req.query.error,
    };

    res.render('login', response);
});

router.post(
    '/login',
    passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login?error=true',
    })
);

router.get('/register', isLoggedOut, (req, res) => {
    const response = {
        title: 'Register',
        error: req.query.error,
    };

    res.render('register', response);
});

router.post('/register', isLoggedOut, async (req, res) => {
    const exists = await User.exists({ email: req.body.email });

    if (exists) {
        res.redirect('/login');
        return;
    }

    bcrypt.genSalt(10, function (err, salt) {
        if (err) return next(err);
        bcrypt.hash(req.body.password, salt, function (err, hash) {
            if (err) return next(err);

            const newUser = new User({
                name: req.body.name,
                email: req.body.email,
                password: hash,
            });

            newUser.save();

            res.redirect('/login');
        });
    });
});

router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

// Setup our admin user
router.get('/setup', async (req, res) => {
    const exists = await User.exists({ email: 'admin' });

    if (exists) {
        res.redirect('/login');
        return;
    }

    bcrypt.genSalt(10, function (err, salt) {
        if (err) return next(err);
        bcrypt.hash('pass', salt, function (err, hash) {
            if (err) return next(err);

            const newAdmin = new User({
                name: 'admin',
                email: 'admin@here',
                password: hash,
            });

            newAdmin.save();

            res.redirect('/login');
        });
    });
});

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

function isLoggedOut(req, res, next) {
    if (!req.isAuthenticated()) return next();
    res.redirect('/');
}

module.exports = router;
