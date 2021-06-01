const express = require('express');
const session = require('express-session');
const hbs = require('express-handlebars');
const mongoose = require('mongoose');
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const app = express();
require('dotenv').config();
const routesUsers = require('./routes/routes');
const User = require('./models/user');
const server = require('http').Server(app);
const io = require('socket.io')(server);

mongoose.connect(process.env.DB_CONNECTION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Middleware
app.engine('hbs', hbs({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.use(express.static(__dirname + '/public'));
app.use(
    session({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: true,
    })
);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Passport.js
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(
    new localStrategy(
        {
            usernameField: 'email',
        },
        function (email, password, done) {
            User.findOne({ email: email }, function (err, user) {
                if (err) return done(err);
                if (!user)
                    return done(null, false, {
                        message: 'Incorrect email.',
                    });

                bcrypt.compare(password, user.password, function (err, res) {
                    if (err) return done(err);
                    if (res === false)
                        return done(null, false, {
                            message: 'Incorrect password.',
                        });

                    return done(null, user);
                });
            });
        }
    )
);

app.use('/', routesUsers);

const users = {};

io.on('connection', (socket) => {
    socket.on('new-user', (name) => {
        users[socket.id] = name;
        socket.broadcast.emit('user-connected', name);
    });
    socket.on('send-chat-message', (message) => {
        socket.broadcast.emit('chat-message', {
            message: message,
            name: users[socket.id],
        });
        socket.on('disconnect', () => {
            socket.broadcast.emit('user-disconnected', users[socket.id]);
            delete users[socket.id];
        });
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`listening on http://localhost:${PORT}/`);
});
