var topic="owntracks/#"
var mqtt = require('mqtt')
var client  = mqtt.connect('mqtt://localhost:8889')
var request = require('request');

var url = "https://stackptr.com/update"

client.on('connect', function () {
  client.subscribe(topic)
})
 
client.on('message', function (topic, message) {
  // message is Buffer
var devId = topic.split("/").slice(-1)[0]
 var locobject = JSON.parse(message.toString())
 updatePtr(devId, locobject.lat, locobject.lon, locobject.batt )
})


function updatePtr(apikey, lat,lon,battery){
	var ext = {bat: battery/100}
        var data = {form:{apikey:apikey,lat:lat, lon:lon, ext: JSON.stringify(ext) }}
	request.post(url, data, function(err,httpResponse,body){
	})

}
