/*jslint vars: true */
/*jslint browser: true, node: true*/
/*global angular, $, jQuery, google, alert*/

'use strict';

var amqp   = require('amqp'),
    Q      = require('q'),
    RPC    = require('./rpc');

//Global Variables
var RPC_QUEUE_NAME = "xslt-transformer";
var EXCHANGE_NAME = "rpc";
var RABBIT_HOST = "localhost";
var RABBIT_USER = "guest";
var RABBIT_PASS = "guest";
var RABBIT_VHOST = "/";

var createConnection = function () {
    console.log("Connection Setup");
    var deferred = Q.defer();
    var connection = amqp.createConnection({
        host: RABBIT_HOST,
        login: RABBIT_USER,
        password: RABBIT_PASS,
        vhost: RABBIT_VHOST
    }, { // reconnection options
        reconnect: true,
        reconnectBackoffStrategy: 'linear', // or 'exponential'
        reconnectBackoffTime: 500
    });
    connection.on('ready', function () {
        console.log("Connection is open");
        deferred.resolve(connection);
    });
    connection.on("error", function (error) {
        connection.end();
        deferred.reject(error);
    });

    return deferred.promise;
};

var createExchange = function (connection) {
    console.log("Exchange Setup");
    var deferred = Q.defer();
    connection.exchange(EXCHANGE_NAME, {
        type: 'direct',
        durable: true,
        autoDelete: false
    }, function (exchange) {
        console.log("Exchange '" + exchange.name + "' is open");
        deferred.resolve(exchange);
    });
    return deferred.promise;
};

var createQueue = function (connection) {
    console.log("Queue Setup");
    var deferred = Q.defer();
    var rpcQueue = connection.queue(RPC_QUEUE_NAME, {
        passive: false,
        durable: true,
        exclusive: false,
        autoDelete: false
    }, function (queue) {
        console.log("Queue '" + queue.name + "' is open");
        deferred.resolve(queue);
    });
    return deferred.promise;
};

var xsltTransform = function (source, stylesheet) {
    var deferred = Q.defer();
    createConnection()
        .then(function (connection) {
            return Q.all([
                connection,
                createExchange(connection),
                createQueue(connection)
            ]);
        })
        .spread(function (connection, exchange, queue) {
            console.log(">> " + exchange.name);
            var xsltTransformer  = new RPC(connection, exchange, queue);
            var req = {
                "sup": "fish"
            };
            xsltTransformer.makeRequest(req, function (error, response) {
                console.log("cb1");
                console.log(response);
            });

            console.log("xxxx");
            setTimeout(function () {
                console.log("Second req");
                xsltTransformer.makeRequest(req, function (error, response) {
                    console.log("cb2");
                    console.log(response);
                });
            }, 6000);
            //console.log(exchange, queue);
            return;
        })
        .then(function () {
            //deferred.resolve("all done");
        });
    return deferred.promise;
};


xsltTransform("sourceXX", "styleYY").then(function (result) {
    //console.log("RESULT--->" + result);
});
