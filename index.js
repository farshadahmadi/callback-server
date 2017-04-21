var express = require('express');
var app = express();
var bodyParser = require("body-parser");
var request = require('request');

app.use(bodyParser.json());

var routingTable = {};

/*app.use(function(req, res, next){
  console.log('method: ' + req.method);
  console.log('query: ' + JSON.stringify(req.query));
  console.log('params: ' + JSON.stringify(req.params));
  console.log('body: ' + JSON.stringify(req.body));
  next();
});*/

app.get('/', function (req, res) {
  res.status(200).send(JSON.stringify(routingTable));
});

app.post('/', function (req, res) {
  console.log('body: ' + JSON.stringify(req.body));
  var requestId = req.body.responses[0].requestId;
  console.log(requestId);
  req.pipe(request.post({uri: routingTable[requestId]}));
  res.status(200).send();
});

app.post('/register', function (req, res) {
  console.log('body: ' + JSON.stringify(req.body));
  routingTable[req.body.requestId] = req.body.url;
  res.status(200).send();
});

app.listen(8080, function () {
  console.log('Example app listening on port 8080!')
})
