var express = require('express')
var app = express()
var spawn = require('child_process').spawn;

app.get('/', function (req, res) {
  /*var child = spawn('ls', ["-l"]);
  child.stdout.on("data", function(data){
    var str = String(data);
    console.log(str);
    res.send('Hello Farshad!');
  });*/
  console.log(__dirname);
  res.send('Hello Farshad!');
  
})

app.listen(8080, function () {
  console.log('Example app listening on port 8080!')
})
