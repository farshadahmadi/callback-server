var express = require('express');
var app = express();
var bodyParser = require("body-parser");

app.use(bodyParser.json());

app.use(function(req, res, next){
  console.log('method: ' + req.method);
  console.log('query: ' + JSON.stringify(req.query));
  console.log('params: ' + JSON.stringify(req.params));
  console.log('body: ' + JSON.stringify(req.body));
  next();
});

app.get('/', function (req, res) {
  res.status(200).send();
})

app.listen(8080, function () {
  console.log('Example app listening on port 8080!')
})
