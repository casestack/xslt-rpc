/*jslint vars: true */
/*jslint browser: true, node: true*/
/*global angular, $, jQuery, google, alert*/

'use strict';

var XSLT  = require('./rabbit/rpc-xslt.js'),
    fs = require('fs'),
    winston = require('winston');


winston.loggers.add('RPC-CLIENT', {
    console: {
        level: 'info',
        colorize: 'true',
        label: 'RPC-CLIENT',
        prettyPrint: true,
        timestamp: true
    }
});

var logger = winston.loggers.get('RPC-CLIENT');
var xslt = new XSLT();

if (require.main === module) {

    xslt.transform("self", "test", function () {
        var input = fs.readFileSync('./sample/hello.xml', 'utf8');
        var stylesheet = fs.readFileSync('./sample/hello.xsl', 'utf8');
        logger.info("Input File:");
        logger.info(input);
        logger.info("Stylesheet File:");
        logger.info(stylesheet);
        xslt.transform(input, stylesheet, function (error, output) {
            logger.info("Transformation Output", output);
            var outputJSON = JSON.parse(parser.toJson(output.output));
            logger.info("Transformation Output JSON", outputJSON);
        });
    });
}
