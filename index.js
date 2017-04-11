var express = require('express')
var app = express()

app.use(function(req, res, next){
  console.log('method: ' + req.method);
  console.log('query: ' + req.query);
  console.log('params: ' + req.params);
  console.log('body: ' + req.body);
  next();
});

app.get('/', function (req, res) {
  res.status(200).send();
})

app.listen(8080, function () {
  console.log('Example app listening on port 8080!')
})
