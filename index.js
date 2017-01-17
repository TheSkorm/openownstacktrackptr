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
console.log(topic); 
var devId = topic.split("/").slice(-1)[0]
 var locobject = JSON.parse(message.toString())
 console.log(message.toString());
 updatePtr(devId, locobject.lat, locobject.lon, locobject.batt, locobject.conn )
})


function updatePtr(apikey, lat,lon,battery, provider){
	var ext = {bat: battery/100,prov: provider}
        var data = {form:{apikey:apikey,lat:lat, lon:lon, ext: JSON.stringify(ext) }}
	request.post(url, data, function(err,httpResponse,body){
	})

}
