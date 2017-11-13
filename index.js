var express = require('express');
var app = express();
var bodyParser = require("body-parser");
var request = require('request-promise');

//app.use(bodyParser.json());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));


// if app info is not yet registered (saved to routingTable), it will be queued
var queue = [];

// map requestIds (sent by IMPACT) to the URL of IOT apps, e.g.
// {"requestId":"003ccb2f-74ae-43c5-87b5-31541a209f2a","url":"http://130.230.142.100:8080/app/250330/api"}
var routingTable = {};

// maps app IDs to the subscription IDs the app has created so far. The format is  { "appId": [subscriptionId, subscriptionId, ..., subscriptionID], "appId": []}
// for example: { "569745" : ["003ccb2f-74ae-43c5-87b5-31541a209f2a"] }
var subscriptionsTable = {};

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
    resolveWithFullResponse: false,
    //body: item.data,
    body: item,
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
  console.log(JSON.stringify(routingTable));
  console.log(JSON.stringify(subscriptionsTable));
  res.status(200).send(JSON.stringify(routingTable));
});

app.get('/:appId/subscriptions', function (req, res) {
  //console.log(JSON.stringify(queue));
  //console.log(JSON.stringify(routingTable));
  //console.log(JSON.stringify(subscriptionsTable));
  res.status(200).send(JSON.stringify(subscriptionsTable[req.params.appId] || []));
});

// IMPACT platform sends data to this API
app.post('/', function (req, res) {
  
  console.log('body: ' + JSON.stringify(req.body));

  //res.status(200).send();

  sendAll(req.body)
    .then(function(result){
      console.log(result);
      res.status(200).send();
    });

  // get the requestId to find the target the application to which the data should be routed.
  /*var requestId = req.body.responses[0] ? req.body.responses[0].requestId : null;
  var subscriptionId = req.body.updates[0] ? req.body.updates[0].subscriptionId : null;
  var item = {id: requestId || subscriptionId, data: req.body, mode: requestId ? "once" : "subscription"};
  console.log(item.id);
  console.log(item.mode);
  console.log(routingTable[item.id]);

  send(item).then(function(code){
    res.status(code).send();
  });*/

});

function sendAll(body){
  
  var items = body.responses.map(function(res){
    var data = {reports:[], registrations:[], deregistrations:[], updates:[], expirations:[], responses:[res]};
    var item = {id: res.requestId, data: data , mode: "once"};
    logItem(item);
    return item;
  });

  items.push.apply(items, body.updates.map(function(update){
    var data = {reports:[], registrations:[], deregistrations:[], updates:[update], expirations:[], responses:[]};
    var item = {id: update.subscriptionId, data: data , mode: "subscription"};
    logItem(item);
    return item;
  }));

  items.push.apply(items, body.reports.map(function(report){
    var data = {reports:[report], registrations:[], deregistrations:[], updates:[], expirations:[], responses:[]};
    var item = {id: report.subscriptionId, data: data , mode: "subscription"};
    logItem(item);
    return item;
  }));
  
  items.push.apply(items, body.registrations.map(function(reg){
    var data = {reports:[], registrations:[reg], deregistrations:[], updates:[], expirations:[], responses:[]};
    var item = {id: reg.subscriptionId, data: data , mode: "subscription"};
    logItem(item);
    return item;
  }));
  
  items.push.apply(items, body.deregistrations.map(function(dereg){
    var data = {reports:[], registrations:[], deregistrations:[dereg], updates:[], expirations:[], responses:[]};
    var item = {id: dereg.subscriptionId, data: data , mode: "subscription"};
    logItem(item);
    return item;
  }));

  items.push.apply(items, body.expirations.map(function(exp){
    var data = {reports:[], registrations:[], deregistrations:[], updates:[], expirations:[exp], responses:[]};
    var item = {id: exp.subscriptionId, data: data , mode: "subscription"};
    logItem(item);
    return item;
  }));
  
  return Promise.all(items.map(send));
}

function logItem(item){
  console.log(item.id);
  console.log(item.data);
  console.log(item.mode);
  console.log(routingTable[item.id]);
}

function send(item){
  // if app info is already registered
  if (routingTable[item.id]) {
    // send the data to the app
    return sendDataToApp(item)
      .then(function(result){
        console.log(result);
        if(item.mode == "once") {
          delete routingTable[item.id];
        }
        return 200;
        //res.status(200).send();
      }).catch(function(err){
        console.log(err);
        if(item.mode == "once") {
          delete routingTable[item.id];
        }
        return 200;
        //res.status(200).send();
      });
  // otherwise, queue the app info
  } else {
    item.attempts = 10;
    //queue.push({ id: requestId, data: req.body, attempts: 10});
    queue.push(item);
    return 200;
    //res.status(200).send();
  }
}

// IoT apps registers their info via this aPI.
// App info contains the requestId (that app got from IMPACT platfom immediately after requesting data) and the app URL. e.g.,
// {"requestId":"003ccb2f-74ae-43c5-87b5-31541a209f2a","url":"http://130.230.142.100:8080/app/250330/api"}
app.post('/register', function (req, res) {
  
  console.log('body: ' + JSON.stringify(req.body));
  
  if(req.body.mode === "subscription"){ 
    if(!subscriptionsTable[req.body.appId]){
      subscriptionsTable[req.body.appId] = [];
    }
    subscriptionsTable[req.body.appId].push(req.body.id);
  }

  routingTable[req.body.id] = req.body.url;

  res.status(200).send();
});

app.listen(process.argv[2], function () {
  console.log('Example app listening on port ' + process.argv[2])
})
