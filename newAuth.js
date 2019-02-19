var OAuth = require('oauth').OAuth;
var config = require('./config.json');

//Temporary storage container
var oauth = new OAuth(
    config.request_token_url,
    config.access_token_url,
    config.consumer_key,
    config.consumer_secret,
    config.oauth_version,
    config.oauth_callback,
    config.oauth_signature
);

var twitterCredentials = {
    oauth_token: "",
    oauth_token_secret: "",
    access_token: "",
    access_token_secret: "",
    twitter_id: ""
}

// Using our authenticator module
module.exports = {
    getCredentials: function () {
        return twitterCredentials;
    },
    clearCredentials: function () {
        twitterCredentials.oauth_token = "";
        twitterCredentials.oauth_token_secret = "";
        twitterCredentials.access_token = "";
        twitterCredentials.access_token_secret = "";
        twitterCredentials.twitter_id = "";

    },
    get: function (url, access_token, access_token_secret, callback) { //The target API is "url"
        oauth.get.call(oauth, url, access_token, access_token_secret, callback);
    },
    post: function (url, access_token, access_token_secret, body, callback) {
        oauth.post.call(oauth, url, access_token, access_token_secret, body, callback);
    },
    redirectToTwitterLoginPage: function (req, res) {
        oauth.getOAuthRequestToken(function (err, oauth_token, oauth_token_secret, results) {
            //Method that gets the request token
            if (err) {
                console.log(err);
                res.send("Authentication failed");
            } else {
                twitterCredentials.oauth_token = oauth_token;
                twitterCredentials.oauth_token_secret = oauth_token_secret;
                // res.send("Credentials are stored");
                res.redirect(config.authorize_url + '?oauth_token=' + oauth_token);
            }
        });
    },
    authenticate: function (req, res, callback) {
        if (!(twitterCredentials.oauth_token && twitterCredentials.oauth_token_secret && req.query.oauth_verifier)) {
            return callback("Request does not have all required keys");
        }
        // twitterCredentials.oauth_token = "";
        // twitterCredentials.oauth_token_secret = "";
        oauth.getOAuthAccessToken(twitterCredentials.oauth_token, twitterCredentials.oauth_token_secret, req.query.oauth_verifier,
            function (error, oauth_access_token, oauth_access_token_secret, results) {
                if (error) {
                    return callback(error);
                }
                oauth.get('https://api.twitter.com/1.1/account/verify_credentials.json', oauth_access_token, oauth_access_token_secret,
                    function (error, data) {
                        if (error) {
                            console.log(error);
                            return callback(error);
                        }
                        data = JSON.parse(data);
                        twitterCredentials.access_token = oauth_access_token;
                        twitterCredentials.access_token_secret = oauth_access_token_secret;
                        twitterCredentials.twitter_id = data.id_str;
                        console.log(data);
                        return callback();
                    });
            });
    }
}