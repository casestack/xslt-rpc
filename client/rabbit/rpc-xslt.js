/*jslint vars: true,  nomen: true */
/*jslint browser: true, node: true*/
/*global angular, $, jQuery, google, alert*/

'use strict';

//adapted from
//https://gist.github.com/kmpm/2720846

var RPC     = require('./rpc'),
    Rabbit  = require('./connection'),
    Q       = require('q'),
    assert = require("assert"),
    winston = require('winston');

winston.loggers.add('RPC-XSLT', {
    console: {
        level: 'info',
        colorize: 'true',
        label: 'XSLT RPC',
        prettyPrint: true,
        timestamp: true
    }
});

var logger = winston.loggers.get('RPC-XSLT');

function XSLT() {
    logger.info("New RPC XSLT Instantiated");
    var self = this;
    this.rpc = null;
    this.rabbit = new Rabbit({}, {name: 'rpc'}, {name: 'xslt-transformer'});
}

XSLT.prototype.transform = function (source, stylesheet, callback) {
    logger.info("Making XSLT-RPC request");
    var startTime = (new Date()).getTime();
    var self = this;
    var requestData;
    var selfTest = (source === "self" && stylesheet === "test");

    //reason for self test, to make sure conection is created and response ques are made before onslaught
    if (selfTest) {
        requestData = {
            source: "<?xml version=\"1.0\"?> <greeting>Hello world.</greeting>",
            stylesheet: "<?xml version=\"1.0\"?> <html xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\" xsl:version=\"1.0\"> <head><title>Hello World</title></head> <body> <p> I just want to say <b><xsl:value-of select=\"greeting\"/></b> </p></body> </html>"
        };
    } else {
        requestData = {
            source: source,
            stylesheet: stylesheet
        };
    }

    this.rabbit.setup().then(function () {
        if (self.rpc === null) {
            self.rpc = new RPC(self.rabbit.connection, self.rabbit.exchange, self.rabbit.queue);
        }
        self.rpc.makeRequest(requestData, function (error, output) {
            var endTime = (new Date()).getTime();
            var time = endTime - startTime;
            logger.info("XSLT-RPC finished in " + time + "ms");
            if (selfTest) {
                logger.info("Performing Self Test");
                assert.equal(output.output, '<html>\n   <head>\n      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n      <title>Hello World</title>\n   </head>\n   <body>\n      <p> I just want to say <b>Hello world.</b></p>\n   </body>\n</html>', "XSLT RPC Self Test Failure");
            }
            if (output.hasOwnProperty('error')) {
                error = output.error;
            }
            if (error) {
                logger.error("XSLT-RPC Error", error);
            }
            callback(error, output);
        });
    });
};

exports = module.exports = XSLT;


if (require.main === module) {
    var dataMapper = new XSLT();
    var output = function (error, output) {
        console.log(output);
        console.log("-----");
    };
    dataMapper.transform("self", "test", output);

    setTimeout(function () {
        var i;
        for (i = 0; i <= 100; i += 1) {
            dataMapper.transform("self", "test", output);
        }
    }, 3000);
}
