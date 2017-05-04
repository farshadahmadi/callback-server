var express = require('express');
var app = express();
var bodyParser = require("body-parser");
var request = require('request-promise');

app.use(bodyParser.json());

// if app info is not yet registered (saved to routingTable), it will be queued
var queue = [];

// map requestIds (sent by IMPACT) to the URL of IOT apps, e.g.
// {"requestId":"003ccb2f-74ae-43c5-87b5-31541a209f2a","url":"http://130.230.142.100:8080/app/250330/api"}
var routingTable = {};

/*app.use(function(req, res, next){
  console.log('method: ' + req.method);
  console.log('query: ' + JSON.stringify(req.query));
  console.log('params: ' + JSON.stringify(req.params));
  console.log('body: ' + JSON.stringify(req.body));
  next();
});*/

// send data to the IoT app
function sendDataToApp(item){
  return request({
    url: routingTable[item.id],
    headers: {'content-type':'application/json'},
    method: 'POST',
    json: true,
    body: item.data,
    timeout: 5000
  });
}

// pop an item from queue
function processQueue(){
  // pop app info from the queue
  var item = queue.shift();
  // if queue is not empty and the popped item has already not tried all of its 10 attempts
  if (item && item.attempts) {
    // if app info is already registered
    if(routingTable[item.id]){
      // send the data to the app
      sendDataToApp(item)
        .then(function(result){
          console.log(result);
          if(item.mode == "once") {
            delete routingTable[item.id];
          }
        }).catch(function(err){
          console.log(err);
          if(item.mode == "once") {
            delete routingTable[item.id];
          }
        });
    // otherwise, queue the app info again
    } else {
      console.log(item.attempts);
      item.attempts--;
      queue.push(item);
    }
  }
}

// pops items from queue every 1 second
setInterval(processQueue, 1000);

app.get('/', function (req, res) {
  console.log(JSON.stringify(queue));
  res.status(200).send(JSON.stringify(routingTable));
});

// IMPACT platform sends data to this API
app.post('/', function (req, res) {
  console.log('body: ' + JSON.stringify(req.body));
  // get the requestId to find the target the application to which the data should be routed.
  var requestId = req.body.responses[0] ? req.body.responses[0].requestId || null;
  var subscriptionId = req.body.updates[0] ? req.body.updates[0].subscriptionId || null;
  //console.log(requestId);
  //console.log(routingTable[requestId]);
  var item = {id: requestId || subscriptionId, data: req.body, mode: requestId ? "once" : "subscription"};
  console.log(item.id);
  console.log(item.mode);
  console.log(routingTable[item.id]);

  // if app info is already registered
  if (routingTable[item.id]) {
    // send the data to the app
    sendDataToApp(item)
      .then(function(result){
        console.log(result);
        if(item.mode == "once") {
          delete routingTable[item.id];
        }
        res.status(200).send();
      }).catch(function(err){
        console.log(err);
        if(item.mode == "once") {
          delete routingTable[item.id];
        }
        res.status(200).send();
      });
  // otherwise, queue the app info
  } else {
    item.attempts = 10;
    //queue.push({ id: requestId, data: req.body, attempts: 10});
    queue.push(item);
    res.status(200).send();
  }
});

// IoT apps registers their info via this aPI.
// App info contains the requestId (that app got from IMPACT platfom immediately after requesting data) and the app URL. e.g.,
// {"requestId":"003ccb2f-74ae-43c5-87b5-31541a209f2a","url":"http://130.230.142.100:8080/app/250330/api"}
app.post('/register', function (req, res) {
  console.log('body: ' + JSON.stringify(req.body));
  //routingTable[req.body.requestId] = req.body.url;
  routingTable[req.body.id] = req.body.url;
  res.status(200).send();
});

app.listen(8080, function () {
  console.log('Example app listening on port 8080!')
})
