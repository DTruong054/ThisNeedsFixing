var OAuth = require('oauth').OAuth; //If capitalized, this means an object
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

var twitterCred = {
    oauth_token: "",
    oauth_token_secret: "",
    access_token: "",
    access_token_secret: "",
    twitter_id: ""
}

module.exports = {
    getCredentials: function () {
        return twitterCred;
    },
    clearCredentials: function () {
        twitterCred.oauth_token = "";
        twitterCred.oauth_token_secret = "";
        twitterCred.access_token = "";
        twitterCred.access_token_secret = "";
        twitterCred.twitter_id = "";
    },
    get: function (url, access_token, access_token_secret, callback) { //The target API is "url"
        oauth.get.call(oauth, url, access_token, access_token_secret, callback);
    },
    post: function (url, access_token, access_token_secret, body, callback) {
        oauth.post.call(oauth, url, access_token, access_token_secret, body, callback);
    },
    redirectLogin: function (req, res) {
        oauth.getOAuthRequestToken(function (err, oauth_token, oauth_token_secret, results) {
            //Method that gets the request token
            if (err) {
                console.log(err);
                res.send("There was an error trying to process your request, please try again at a later date");
            } else {
                twitterCred.oauth_token = oauth_token;
                twitterCred.oauth_token_secret = oauth_token_secret;
                // res.send("Credentials stored!");
                res.redirect(config.authorize_url + '?oauth_token=' + oauth_token);
                //This would redirect to another page
            }
        })
    },
    authenticate: function (req, res, callback) {
        if (!(twitterCred.oauth_token && twitterCred.oauth_token_secret && req.query.oauth_verifier)) {
            return callback("Request doesn't have all keys nessesary");
        }
        // twitterCred.oauth_token = ""; //Wipes the oauth_token
        // twitterCred.oauth_token_secret = ""; //wipes the token secret
        oauth.getOAuthAccessToken(twitterCred.oauth_token, twitterCred.oauth_token_secret, req.query.oauth_verifier, function (err, oauth_access_token, oauth_access_token_secret, results) {
            if (err) {
                return callback(err);
            }

            oauth.get('https://api.twitter.com/1.1/account/verify_credentials.json', oauth_access_token, oauth_access_token_secret, function (err, data) {
                if (err) {
                    console.log(err);
                    return callback(err);
                }
                data = JSON.parse(data);
                twitterCred.access_token = oauth_access_token;
                twitterCred.access_token_secret = oauth_access_token_secret;
                twitterCred.twitter_id = data.id_str;
                console.log(data);
                return callback();
            });
        })
    }
}