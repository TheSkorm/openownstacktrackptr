var topic = "owntracks/#"
var mqtt = require('mqtt')
var autobahn = require('autobahn');
var mqttoptions = require('./mqttoptions.js');
var client = mqtt.connect('mqtts://localhost:8883', mqttoptions)
var request = require('request');
var url = require("url");
var stackptrurl = "https://stackptr.com/update"
var base64 = require('node-base64-image');

var stackptrUsers = {}

client.on('connect', function() {
    client.subscribe(topic)
})


client.on('message', function(topic, message) {
    // message is Buffer
    var devId = topic.split("/").slice(-1)[0]
    var user = topic.split("/").slice(-2)[0]
    try {
        var locobject = JSON.parse(message.toString())
        updatePtr(devId, locobject.lat, locobject.lon, locobject.batt)
        if (!(devId in stackptrUsers) && devId.length == 32) {
            stackptrUsers[devId] = createWS(devId, user);
            console.log("updating stackptr for owntracks user " + user);
        }
    } catch (e) {
        console.log(e);
    }
})


function updatePtr(apikey, lat, lon, battery) {
    var ext = {
        bat: battery / 100,
        prov: "via OwnTracks"

    }
    var data = {
        form: {
            apikey: apikey,
            lat: lat,
            lon: lon,
            ext: JSON.stringify(ext)
        }
    }
    request.post(stackptrurl, data, function(err, httpResponse, body) {})

}

function loginToWamp(key) {
    return function(event, data) {
        return (key);
    }
}

function sendCard(user, fakename, data) {
    var card = {
        "_type": "card",
        "name": fakename
    }
    var parts = url.parse(data, true);
    parts.query.s = 40;
    delete parts.search;
    console.log("Send card to owntracks[" + user + "] for stackptr user " + fakename)
    base64.encode(url.format(parts), {
        string: true
    }, function(err, data) {
        card.face = data;
        client.publish('owntracks/' + user + '/' + fakename + "/info", JSON.stringify(card), {
            retain: true
        });

    })

}

function updateUsers(user, data2, sendc) {
    for (var i = 0; i < data2.msg.length; i++) {
        var content = data2.msg[i];
        console.log("Sending to owntracks[" + user + "]" + " data from stackptr user " + content.username)
        fakeOwnTracks(user, content.username, {
            "_type": "location",
            lat: content.loc[0],
            lon: content.loc[1],
            tid: content.username.substring(0, 2),
            t: "a",
            batt: content.extra.bat * 100,
            tst: content.lastupd,
            conn: "w"
        })
        if (sendc) {
            sendCard(user, content.username, content.icon)
        }
    }
}

function fakeOwnTracks(user, fakename, data) {
    client.publish('owntracks/' + user + '/' + fakename, JSON.stringify(data), {
        retain: true
    });
}

function createWS(key, user) {
    console.log("Creating websocket for " + user)
    var connection = new autobahn.Connection({
        url: 'wss://stackptr.com/ws',
        realm: 'stackptr',
        authid: '-1',
        authmethods: ["ticket"],
        onchallenge: loginToWamp(key)
    });
    var updater = {};
    connection.onopen = function(session) {
        console.log("websocket opened");

        session.subscribe("com.stackptr.user", function(data1, data2) {
            return updateUsers(user, data2)
        });
        var callUpdate = function() {
            try {
                session.call('com.stackptr.api.userList').then(function(data) {
                    updateUsers(user, {
                        "msg": data[1].data
                    }, true)
                });
            } catch (e) {
                console.log(e)
            }
        }
        console.log("starting update timer")
        updater = setInterval(callUpdate, 900000);
        callUpdate();
    }
    connection.onclose = function(reason, details) {
        console.log("///")
        console.log(reason);
        console.log(details);
        console.log("deleting timer")
        clearInterval(updater)
        console.log("\\\\\\");

    }
    connection.open();
}