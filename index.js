var express = require('express');
var app = express();
var bodyParser = require("body-parser");
var request = require('request-promise');

app.use(bodyParser.json());

var queue = [];

var routingTable = {};

/*app.use(function(req, res, next){
  console.log('method: ' + req.method);
  console.log('query: ' + JSON.stringify(req.query));
  console.log('params: ' + JSON.stringify(req.params));
  console.log('body: ' + JSON.stringify(req.body));
  next();
});*/

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

function processQueue(){
  var item = queue.shift();
  if (item) {
    if(routingTable[item.id]){
      sendDataToApp(item)
        .then(function(result){
          console.log(result);
        }).catch(function(err){
          console.log(err);
        });
    } else {
      queue.push(item);
    }
  }
}

setTimeout(processQueue, 1000);

app.get('/', function (req, res) {
  res.status(200).send(JSON.stringify(routingTable));
});

// IMPACT sends data to this API
app.post('/', function (req, res) {
  console.log('body: ' + JSON.stringify(req.body));
  // get the requestId to find the target the application to which the data should be routed.
  var requestId = req.body.responses[0].requestId;
  console.log(requestId);
  console.log(routingTable[requestId]);
  var item = {id: requestId, data: req.body};

  if (routingTable[requestId]) {
    sendDataToApp(item)
      .then(function(result){
        console.log(result);
        res.status(200).send();
      }).catch(function(err){
        console.log(err);
        res.status(200).send();
      });
  } else {
    queue.push({ id: requestId, data: req.body});
    res.status(200).send();
  }

  /*req.pipe(request.post({
    uri: routingTable[requestId],
    headers:{'content-type':'application/json'}
  }))
  .on('error', function(error){
    console.log(error.toString())
    res.status(200).send();
  })
  .on('response', function(result){
    res.status(200).send();
  })*/
  //.pipe(res);
  //req.pipe(request.post({url: routingTable[requestId], timeout: 15000}));//.pipe(res);
  //res.status(200).send();
});

app.post('/register', function (req, res) {
  console.log('body: ' + JSON.stringify(req.body));
  routingTable[req.body.requestId] = req.body.url;
  res.status(200).send();
});

app.listen(8080, function () {
  console.log('Example app listening on port 8080!')
})
