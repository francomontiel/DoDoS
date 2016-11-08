var express = require("express");
var app = express();
var request = require("request");
app.use(express.static(__dirname + '/'));
var bodyParser = require('body-parser');

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var serverAddress = "http://127.0.0.1:8080";
var id = process.argv.slice(2);//"My IoT";
var leader = true;
var receivedAll = 0;
var electionSent = 0;

function randomizer(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildJSONbody() {
	var sensor0, sensor1, sensor2;
	var d = new Date();

	sensor0 = randomizer(-20, 20) * 5;
	sensor1 = randomizer(-20, 20) * 5;
	sensor2 = randomizer(-20, 20) * 5;

	var jsonbody = "{ \"id\" : \"" + id + "\", \"datetime\" : \"";
	jsonbody += d.getFullYear() + "-";
	jsonbody += (d.getMonth()+1) + "-";
	jsonbody += d.getDate() + " ";
	jsonbody += d.getHours() + ":";
	jsonbody += d.getMinutes() + ":";
	jsonbody += d.getSeconds();
	jsonbody += "\", \"data\" : { \"sensor0\" : " + sensor0;
	jsonbody += ", \"sensor1\" : " + sensor1;
	jsonbody += ", \"sensor2\" : " + sensor2 + " }}";

	return jsonbody;
}

function sendSensorData() {
	request.put({
	  headers: {"content-type" : "application/json"},
	  url:     serverAddress + "/attacker",
	  body:    buildJSONbody()
	}, function(error, res, body){
	  //console.log(body);
	  attackersData = JSON.parse(body);
	});
	//console.log(attackersData);
}

function sendPortToMaster() {
	request.post({
	  headers: {"content-type" : "application/json"},
	  url:     serverAddress + "/attacker",
	  body:    JSON.stringify({"port": port, "id": id})
	}, function(error, res, body){
	  //console.log(body);
	  setInterval(sendSensorData, 1000);
	});	
}

function sendLeaderToMaster(leader) {
	request.post({
	  headers: {"content-type" : "application/json"},
	  url:     serverAddress + "/leader",
	  body:    JSON.stringify({"leader": leader})
	}, function(error, res, body){
	  if (!(body === "LEADER")) {
	  	console.log("I'm the leader");
	  	sendAttackRequestToAll(chooseRandomVictim(JSON.parse(body)));
	  }
	});	
}

function sendAttackRequestToAll(victim) {
	console.log(victim + " is going to die!");
	console.log("God have mercy on it's soul...");
	sendAttackRequestTo(victim, serverAddress);
	for (var key in attackersData) {
		sendAttackRequestTo(victim, "http://" + attackersData[key].ip + ":" + attackersData[key].port);
	}
}

function sendAttackRequestTo(victim, address) {
	request.post({
	  headers: {"content-type" : "application/json"},
	  url:     address + "/victim",
	  body:    JSON.stringify({"victim": victim})
	}, function(error, res, body){

	});
}

function chooseRandomVictim(victims) {
	return victims[Math.floor(Math.random() * victims.length)];
}

function sendElectionTo(msg, ip, port) {
	request.put({
	  headers: {"content-type" : "application/json"},
	  url:     "http://" + ip + ":" + port + "/election",
	  body:    JSON.stringify(msg)
	}, function(error, res, body){
	  	console.log(body);
	  	if (body === "OK") {
	  		leader = false;
	  	}
	  	receivedAll++;
	  	if (receivedAll === electionSent && leader) {
	  		console.log("Received all");
	  		sendLeaderToMaster(id);
	  	}
	});
}

function sendElectionToAll() {
	receivedAll = 0;
	electionSent = 0;
	leader = true;
	console.log("SEARCHING");
	console.log(attackersData);
	for (var key in attackersData) {
	  	if (key > id) {
			electionSent++;
		}
	}
	if (electionSent === 0) {
		sendLeaderToMaster(id);
	} else {
		for (var key in attackersData) {
			if (key > id) {
				console.log(key);
				sendElectionTo({"id": id}, attackersData[key].ip, attackersData[key].port);
			}
		}
	}
}

/*app.post("/attackers", function(req, res) {
	console.log("receiving attackers data...");
	attackersData = req.body;
	//console.log(attackersData);
	res.sendStatus(200);
});*/

app.put("/election", function(req, res) {
	console.log("receiving election...");
	res.send("OK");
	sendElectionToAll();
});

app.post("/election", function(req, res) {
	console.log("starting election...");
	sendElectionToAll();
});

app.post("/victim", function(req, res) {
	console.log("attacking...");
	res.sendStatus(200);
});


//Starts this attacker. Default Port would be 8081, else +1
var port = 8081;
var attackersData = {};

function connect(p) {
	app.listen(p, function() {
		console.log(p);
		sendPortToMaster();
	}).on('error', function(err) {
		port++;
		console.log("Unavailable port. Increasing by 1, now trying on port: " + port);
		connect(port);
	});
	console.log("Attacker on:" + port);
}

connect(port);
