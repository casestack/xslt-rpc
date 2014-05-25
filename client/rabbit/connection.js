/*jslint vars: true */
/*jslint browser: true, node: true*/
/*global angular, $, jQuery, google, alert*/

'use strict';

var amqp    = require('amqp'),
    Q       = require('q'),
    winston = require('winston');

//Global Variables
var RABBIT_HOST = "localhost";
var RABBIT_USER = "guest";
var RABBIT_PASS = "guest";
var RABBIT_VHOST = "/";

winston.loggers.add('RabbitMQ-Connection', {
    console: {
        level: 'info',
        colorize: 'true',
        label: 'RabbitMQ Connection',
        prettyPrint: true,
        timestamp: true
    }
});

var logger = winston.loggers.get('RabbitMQ-Connection');

function RabbitMQ(connectionOptions, exchangeOptions, queueOptions) {
    logger.info("New Connection Instantiated");
    var self = this;
    this.connectionOptions = (typeof connectionOptions === 'undefined') ? {} : connectionOptions;
    this.exchangeOptions = (typeof exchangeOptions === 'undefined') ? {} : exchangeOptions;
    this.queueOptions = (typeof queueOptions === 'undefined') ? {} : queueOptions;
    this.connection = false;
    this.exchange = false;
    this.queue = false;
    this.setupStarted = false;
}

RabbitMQ.prototype.createConnection = function () {
    logger.info("Connection Setup");
    var self = this;
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
        logger.info("Connection is open to " +  connection.serverProperties.product);
        self.connection = connection;
        deferred.resolve();
    });
    connection.on("error", function (error) {
        logger.error("Error opening Connection", error);
        connection.end();
        deferred.reject(error);
    });

    return deferred.promise;
};

RabbitMQ.prototype.createExchange = function () {
    logger.info("Exchange Setup");
    var self = this;
    var deferred = Q.defer();
    self.connection.exchange(self.exchangeOptions.name, {
        type: self.exchangeOptions.type || 'direct',
        durable: true,
        autoDelete: false
    }, function (exchange) {
        logger.info("Exchange '" + exchange.name + "' is open");
        self.exchange = exchange;
        deferred.resolve();
    });
    return deferred.promise;
};

RabbitMQ.prototype.createQueue = function () {
    var self = this;
    logger.info("Queue Setup");
    var deferred = Q.defer();
    var rpcQueue = self.connection.queue(self.queueOptions.name, {
        passive: false,
        durable: true,
        exclusive: false,
        autoDelete: false
    }, function (queue) {
        logger.info("Queue '" + queue.name + "' is open");
        self.queue = queue;
        deferred.resolve();
    });
    return deferred.promise;
};

RabbitMQ.prototype.setup = function () {
    var self = this;
    var deferred = Q.defer();
    if (self.setupStarted) {
        logger.info("Connection Instance has already been setup");
        deferred.resolve();
    } else {
        self.setupStarted = true;
        self.createConnection()
            .then(function () {
                return Q.all([
                    self.createExchange(),
                    self.createQueue()
                ]);
            })
            .then(function () {
                //bind queue to exchange
                self.queue.bind(self.exchange.name, self.queue.name);
                logger.info("Connection Instance Setup Complete");
                deferred.resolve();
            });
    }
    return deferred.promise;
};

exports = module.exports = RabbitMQ;
