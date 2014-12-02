var fs = require("fs"),
    ddpFile = process.argv[2],
    methodsOut = process.argv[3],
    pubsOut = process.argv[4],
    lineReader = require("line-reader"),
    regEx = new RegExp(/[0-9]+\s*OUT\s*[0-9]+\s*/),
    serializer = new Serializer(methodsOut, pubsOut);

if ( !fs.existsSync(ddpFile) ) {
  console.error(ddpFile, "does not exist");
  return;
}

if (!methodsOut) {
  console.error("3rd agument must be path to methods output file");
  return;
}

if (!pubsOut) {
  console.error("4rd agument must be path to pubs output file");
  return;
}

lineReader.eachLine(ddpFile, function(line, last) {

    if (!line.match(regEx)) {
      return;
    }

    var json = JSON.parse(line.replace(regEx, ""));

    if ( transformer.supports(json) ) {
      var result = transformer.transform(json);

      serializer.serialize(json, result, last);

    }

}).then(function() {
  serializer.close();
});

var transformer = {
  supports: function(json) {
    if (!json || !json.msg) {
      return false;
    }
    return !!this[json.msg];
  },
  transform: function(json) {
    return this[json.msg](json);
  },
  connect: function() {
    return null;
  },
  connected: function() {
    return null;
  },
  method: function(jsonObj) {

    //{"msg":"method","method":"login","params":[{"resume":"YJx0csR8QprBgiJnK3-w1yjMujHMSnzW1ii-9T1sDnS"}],"id":"15"}

    var obj = {};
    obj[jsonObj.method] = [];

    for ( var i = 0; i < jsonObj.params.length; i++ ) {
      obj[jsonObj.method].push(jsonObj.params[i]);
    }

    return obj;

  },
  sub: function(jsonObj) {

    var obj = {};
    obj[jsonObj.name] = [
      jsonObj.id
    ];
    for ( var i = 0; i < jsonObj.params.length; i++ ) {
      obj[jsonObj.name].push(jsonObj.params[i]);
    }

    return obj;

  }
};

function Serializer(methodsOut, pubsOut) {

  this.methodsOutStream = fs.createWriteStream(methodsOut);
  this.pubsOutStream = fs.createWriteStream(pubsOut);

  this.methodsOutStream.write("[");
  this.pubsOutStream.write("[");

  this.firstMethod = true;
  this.firstPub = true;

}

Serializer.prototype.serialize = function(original, transformed, last) {

  if (!original || !transformed) {
    return;
  }

  if (original.msg == "method") {
    if (!this.firstMethod) {
      this.methodsOutStream.write(",");
    }
    this.methodsOutStream.write(JSON.stringify(transformed));
    this.firstMethod = false;
  } else {
    if (!this.firstPub) {
      this.pubsOutStream.write(",");
    }
    this.pubsOutStream.write(JSON.stringify(transformed));
    this.firstPub = false;
  }

};

Serializer.prototype.close = function() {
  this.methodsOutStream.write("]");
  this.methodsOutStream.end();
  this.pubsOutStream.write("]");
  this.pubsOutStream.end();
};