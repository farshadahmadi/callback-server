var express = require('express')
var app = express()

app.get('/', function (req, res) {
  console.log(req.body);
  res.status(200).send();
})

app.listen(8080, function () {
  console.log('Example app listening on port 8080!')
})
