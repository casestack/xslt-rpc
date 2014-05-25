/*jslint vars: true,  nomen: true */
/*jslint browser: true, node: true*/
/*global angular, $, jQuery, google, alert*/

'use strict';

//adapted from
//https://gist.github.com/kmpm/2720846

var amqp    = require('amqp'),
    crypto  = require('crypto'),
    Q       = require('q'),
    winston = require('winston');

var TIMEOUT = 10000; //time to wait for response - 10 seconds

winston.loggers.add('RabbitMQ-RPC', {
    console: {
        level: 'info',
        colorize: 'true',
        label: 'RabbitMQ RPC',
        prettyPrint: true,
        timestamp: true
    }
});

var logger = winston.loggers.get('RabbitMQ-RPC');

function RabbitRPC(connection, exchange, queue) {
    logger.info("New RPC Instantiated");
    var self = this;
    this.connection = connection;
    this.exchange = exchange;
    this.queue = queue;
    this.pendingRequests = {};  // store all outstanding requests
    this.responseQueue = false; // the response queue which will be instantiated later
    this.setupStarted = false;
}

RabbitRPC.prototype.makeRequest = function (content, callback) {
    var self = this;

    //generate a unique correlation id for this call
    var correlationID = crypto.randomBytes(16).toString('hex');

    //create a timeout for what should happen if we don't get a response
    var timeoutID = setTimeout(function (corr_id) {
        //if this ever gets called we didn't get a response in a timely fashion
        logger.error("RPC Timeout for CorID: " + corr_id);
        callback("RPC Request Timeout", "");

        //delete the entry from hash
        delete self.pendingRequests[corr_id];
    }, TIMEOUT, correlationID);

    //create a request entry to store in a hash
    var entry = {
        callback: callback,
        timeout: timeoutID //the id for the timeout so we can clear it
    };

    //put the entry in the hash so we can match the response later
    self.pendingRequests[correlationID] = entry;

    //make sure we have a response queue setup, then make the request
    self.setupResponseQueue()
        .then(function () {
            logger.info("Dispatching RPC Request. Queue: '" + self.queue.name + "' Exchange: '" + self.exchange.name + "' CorID: " + correlationID);
            self.exchange.publish(self.queue.name, content, {
                correlationId   : correlationID,
                contentType     : 'application/json',
                contentEncoding : 'utf-8',
                replyTo         : self.responseQueue.name
            });
        });
};

RabbitRPC.prototype.setupResponseQueue = function () {
    var deferred = Q.defer();
    var self = this;

    //don't create new queue if its already been created
    //one response queue is shared among all requests for effeciency
    if (this.responseQueue) {
        logger.info("Response queue already exists");
        deferred.resolve();
    } else {
        logger.info("Creating Response queue");

        //create an exclusive queue for responses
        //exclusive means: used by only one connection and the queue will be deleted when that connection closes
        self.connection.queue('', {exclusive: true}, function (queue) {
            queue.bind(self.exchange.name, queue.name);  //bind response to exchange
            self.responseQueue = queue;  //store the response queue for future requests
            logger.info("Response queue Created");
            queue.subscribe(function (message, headers, deliveryInfo, m) {  //subscribe to messages
                var correlationID = m.correlationId;  //get the correlationID
                logger.info("Message Received on Response Queue: '" + queue.name + "' CorID: " + correlationID);
                //is it a response to a pending request
                if (self.pendingRequests.hasOwnProperty(correlationID)) {
                    var entry = self.pendingRequests[correlationID];  //retreive the request entry
                    clearTimeout(entry.timeout);  //clear the timeout
                    delete self.pendingRequests[correlationID];  //delete the entry from pending results
                    entry.callback(null, message);
                }
            });
            deferred.resolve();
        });
    }
    return deferred.promise;
};

exports = module.exports = RabbitRPC;
