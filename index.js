var Botkit = require('botkit');

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.CLIENT_SIGNING_SECRET) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
    process.exit(1);
}

var config = {}
if (process.env.MONGO_URL) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGO_URL}),
        clientSigningSecret: process.env.CLIENT_SIGNING_SECRET
    };
} else {
    config = {
        json_file_store: './db_slackbutton_slash_command/',
        clientSigningSecret: process.env.CLIENT_SIGNING_SECRET
    };
}

var controller = Botkit.slackbot(config).configureSlackApp(
    {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        scopes: ['commands', 'chat:write:user'],
    }
);
controller.setupWebserver(process.env.PORT, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver);

    controller.createOauthEndpoints(controller.webserver, function (err, req, res) {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

controller.on('slash_command', function (slashCommand, message) {

    switch (message.command) {
        case "/caps":
            out = ""
            var text = message.text.split(/(<[^>]+>)/);
            for (var section of text) {
                    if (section[0] == '<') {
                        out += section;
                    } else {
                        for (var char of section) {
                            if (char.match(/[a-z]/i)) {
                                if (getRandomInt(2)) {
                                    out += char.toLowerCase();
                                } else {
                                    out += char.toUpperCase();
                                }
                            } else {
                                out += char;
                            }   
                        }
                    }
            }
            controller.storage.users.get(message.user_id, function(err, user_data) {
                if (err) {
                    console.error(err);
                    slashCommand.replyPrivate(message, {
                        "attachments": [
                            {
                                "fallback": "Please authorize.",
                                "pretext": "Additional permissions are required to use Caps.",
                                "title": "Authorization Caps",
                                "title_link": `https://slack.com/oauth/authorize?client_id=${process.env.CLIENT_ID}&scope=chat:write:user`       
                            }
                        ]
                    });
                    return;
                }
                if (!user_data || !user_data.access_token) {
                    slashCommand.replyPrivate(message, {
                        "attachments": [
                            {
                                "fallback": "Please authorize.",
                                "pretext": "Additional permissions are required to use Caps.",
                                "title": "Authorization Caps",
                                "title_link": `https://slack.com/oauth/authorize?client_id=${process.env.CLIENT_ID}&scope=chat:write:user`       
                            }
                        ]
                    });
                    return;
                }
                slashCommand.api.chat.postMessage({
                    token: user_data.access_token,
                    channel: message.channel,
                    text: out,
                    as_user: true
                }, function(err,response) {
                });
                slashCommand.replyAcknowledge();
            })
            break;
        default:
            slashCommand.replyPrivate(message, "I'm sorry " + message.user +
                ", I'm afraid I can't do that. :robot_face:");
    }
});
