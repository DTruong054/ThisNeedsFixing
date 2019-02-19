/**
 * Name: Daniel Truong
 * Date: 1.17.19
 * FileName: index.js
 */

var express = require('express');
var app = express();
var authenticator = require('./authenticator.js');
var config = require('./config.json');
var url = require('url');
var querystring = require('querystring');
var async = require('async');

//The "app.use" need a function. The require('cookie-parser') fills in for the function, and the () after are needed for parameters.
app.use(require('cookie-parser')());

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs');

app.get('/auth/twitter', authenticator.redirectToTwitterLoginPage); //auth is the file, redirectLogin is the thing being exported from the file

app.get(url.parse(config.oauth_callback).path, function (req, res) {
    authenticator.authenticate(req, res, function (err) {
        if (err) {
            res.redirect('/login');
        } else {
            res.redirect('/');
        }
    });
});

app.get('/tweet', function (req, res) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token ||
        !credentials.access_token_secret) {
        res.sendStatus(401);
    }
    var url = 'https://api.twitter.com/1.1/statuses/update.json';
    authenticator.post(url, credentials.access_token, credentials.access_token_secret, {
        // status: "Glub-bot's Word of the Day: \"Sweltering\""
        // status: "Glub-bot says: \"Quote\""
        // status: "*Glub*"
    }, function (error, data) {
        if (error) {
            return res.status(400).send(error);
        }
        res.send("Tweet successful!")
    });
});

app.get('/search', function (req, res) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token ||
        !credentials.access_token_secret) {
        return res.sendStatus(418);
    }
    var url = 'https://api.twitter.com/1.1/search/tweets.json';
    var query = querystring.stringify({
        q: 'ctran049'
    });
    url += '?' + query;
    authenticator.get(url, credentials.access_token,
        credentials.access_token_secret,
        function (error, data) {
            if (error) {
                return res.status(400).send(error);
            }
            res.send(data);
        });
});

app.get('/friends', function (req, res) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token ||
        !credentials.access_token_secret) {
        return res.sendStatus(401);
    }
    var url = 'https://api.twitter.com/1.1/friends/list.json';
    if (req.query.cursor) {
        url += '?' + querystring.stringify({
            cursor: req.query.cursor
        });
    }
    authenticator.get(url, credentials.access_token,
        credentials.access_token_secret,
        function (error, data) {
            if (error) {
                return res.status(400).send(error);
            }
            res.send(data);
        });
});

app.get('/allfriends', function (req, res) {
    renderMainPageFromTwitter(req, res);
});

app.get('/', function (req, res) {
    var credentials = authenticator.getCredentials();
    if (!credentials.access_token || !credentials.access_token_secret) {
        return res.redirect('/login');
    }
    return renderMainPageFromTwitter(req, res);
});

function renderMainPageFromTwitter(req, res) {
    var credentials = authenticator.getCredentials();
    async.waterfall([
        // Grabbing friend's ID
        function (callback) {
            var cursor = -1;
            var ids = [];
            console.log("ids.length: " + ids.length);
            async.whilst(function () {
                    return cursor != 0;
                }, function (callback) {
                    var url = 'https://api.twitter.com/1.1/friends/ids.json';
                    url += '?' + querystring.stringify({
                        user_id: credentials.twitter_id,
                        cursor: cursor
                    });
                    authenticator.get(url, credentials.access_token, credentials.access_token_secret,
                        function (error, data) {
                            if (error) {
                                return res.status(400).send(error);
                            }
                            data = JSON.parse(data);
                            cursor = data.next_cursor_str;
                            ids = ids.concat(data.ids);
                            console.log("ids.length: " + ids.length);
                            callback();
                        });
                },
                function (error) {
                    console.log('last callback');
                    if (error) {
                        return res.status(500).send(error);
                    }
                    console.log(ids);
                    callback(null, ids);
                });
        },
        // Search friends data
        function (ids, callback) {
            var getHundredIds = function (i) {
                return ids.slice(100 * i, Math.min(ids.length, 100 * (i + 1))); //This grabs the number of friends and divides by 100, then rounds up the number.
            };
            var requestsNeeded = Math.ceil(ids.length / 100);
            async.times(requestsNeeded, function (n, next) {
                    var url = "https://api.twitter.com/1.1/users/lookup.json";
                    url += "?" + querystring.stringify({
                        user_id: getHundredIds(n).join(',')
                    });
                    authenticator.get(url, credentials.access_token, credentials.access_token_secret,
                        function (error, data) {
                            console.log("Lookup");
                            if (error) {
                                console.log("Error");
                                return res.status(400).send(error);
                            }
                            var friends = JSON.parse(data);
                            next(null, friends);
                        });
                },
                function (error, friends) {
                    console.log("next for friends");
                    friends = friends.reduce(function (previousValue, currentValue, currentIndex, array) {
                        //previous and current shortened
                        return previousValue.concat(currentValue);
                    }, []);
                    //Sorts the friends name in order
                    friends.sort(function (a, b) {
                        return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
                    });
                    friends.map(function (friend) {
                        return {
                            twitter_id: friend.id_str,
                            for_user: credentials.twitter_id,
                            name: friend.name,
                            screen_name: friend.screen_name,
                            location: friend.location,
                            profile_image_url: friend.profile_image_url
                        }
                    });
                    res.render('index', {
                        friends: friends
                    });
                    console.log('friends.length', friends.length);
                });
        }
    ]);
}

app.get('/login', function (req, res) {
    res.render('login');
});

app.get('/logout', function (req, res) {
    authenticator.clearCredentials();
    res.redirect('/login');
});

app.get(url.parse(config.oauth_callback).path, function (req, res) {
    authenticator.authenticate(req, res, function (err) {
        // Gets Authenticate function
        if (err) {
            console.log(err);
            res.sendStatus(401);
        } else {
            res.send("Authentication successful");
        }
    });
});

app.listen(config.port, function () {
    console.log("Server is listening on localhost:%s", config.port);
    console.log("OAuth callback:%s", url.parse(config.oauth_callback).hostname + url.parse(config.oauth_callback).path);
});