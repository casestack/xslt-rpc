package com.casestack;

import com.casestack.XSLT;
import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.QueueingConsumer;
import com.rabbitmq.client.AMQP.BasicProperties;

import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;

import java.util.logging.ConsoleHandler;
import java.util.logging.Level;
import java.util.logging.Logger;

public class RabbitRPC {

	private static final String RPC_QUEUE_NAME = "xslt-transformer";
	private static final String EXCHANGE_NAME = "rpc";
	private static final String RABBIT_HOST = "localhost";
	private static final String RABBIT_USER = "guest";
	private static final String RABBIT_PASS = "guest";
	private static final String RABBIT_VHOST = "/";

	private JSONParser parser;

	private final static Logger LOGGER = Logger.getLogger(RabbitRPC.class.getName());

	public RabbitRPC() {
		//setup parser
		parser = new JSONParser();

		//make sure xslt parser uses Saxon
		XSLT.initSaxon();

		//setup logging
        LOGGER.setUseParentHandlers(false);
        MyFormatter formatter = new MyFormatter();
        ConsoleHandler handler = new ConsoleHandler();
        handler.setFormatter(formatter);
        LOGGER.addHandler(handler);
        LOGGER.setLevel(Level.INFO);
	}

	public void startListening() throws Exception {
		//
		// String result = XSLT
		// .transformString(
		// "<?xml version=\"1.0\"?> <greeting>Hello world.</greeting> ",
		// "<?xml version=\"1.0\"?> <html xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\" xsl:version=\"1.0\"> <head><title>Hello World</title></head> <body> <p> I just want to say <b><xsl:value-of select=\"greeting\"/></b> </p></body> </html>");
		//
		// System.out.println(result);

		Connection connection = null;
		Channel channel = null;

		try {
			ConnectionFactory factory = new ConnectionFactory();

			//connection credentials
			factory.setHost(RABBIT_HOST);
			factory.setUsername(RABBIT_USER);
			factory.setPassword(RABBIT_PASS);
			factory.setVirtualHost(RABBIT_VHOST);
			connection = factory.newConnection();

			//channel to talk to rabbit
			channel = connection.createChannel();

			//create a durable "Direct" exchange
		    channel.exchangeDeclare(EXCHANGE_NAME, "direct", true);

		    //create durable queue and bind it to the exchange
		    //queue name, durable, exclusive, autoDelete, arguments
		    channel.queueDeclare(RPC_QUEUE_NAME, true, false, false, null);

	        channel.queueBind(RPC_QUEUE_NAME, EXCHANGE_NAME, "");

			// In order to spread the load equally over multiple servers we need
			// to set the prefetchCount setting in channel.basicQos
			channel.basicQos(1);

			//start consuming on that queue. Auto autoAcknowledge is false.
			//We manually do it after we send response
			QueueingConsumer consumer = new QueueingConsumer(channel);
			channel.basicConsume(RPC_QUEUE_NAME, false, consumer);

			LOGGER.info("Awaiting RPC requests on queue '" + RPC_QUEUE_NAME + "' in exchange '" + EXCHANGE_NAME + "'");

			while (true) {

				//Wait for next message. This is a blocking operation
				//Only 1 message is processed at a time
				QueueingConsumer.Delivery delivery = consumer.nextDelivery();

				//properties of message received
				BasicProperties props = delivery.getProperties();

				//create a response
				JSONObject response = new JSONObject();

				//create properties of response. append correlation ID
				BasicProperties replyProps = new BasicProperties.Builder()
						.correlationId(props.getCorrelationId())
						.contentType("application/json")
						.contentEncoding("utf-8")
						.build();

				try {
					//get message
					String message = new String(delivery.getBody());
					JSONObject messageJSON = (JSONObject) parser.parse(message);
					LOGGER.info("REQUEST received with CorID: " + props.getCorrelationId());
					// LOGGER.info("\t" + messageJSON.toJSONString());

					//build response
					response.put("output", XSLT.transformString(messageJSON.get("source").toString(), messageJSON.get("stylesheet").toString()));

				} catch (Exception e) {

					//error details
					LOGGER.severe("MESSAGE ERROR: " + e.toString());
					response.put("error", e.toString());

				} finally {

					//dispatch response on the exchange
					channel.basicPublish(EXCHANGE_NAME, props.getReplyTo(), replyProps,
							response.toJSONString().getBytes());

					LOGGER.info("Replied on queue '" + props.getReplyTo() + "' to CorID: " + replyProps.getCorrelationId());
					// LOGGER.info("\t" + response.toJSONString());

					//Finally Acknowledge the received message.
					channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
				}
			}
		} catch (Exception e) {
			LOGGER.severe("CRITICAL ERROR");
			e.printStackTrace();
		} finally {
			if (connection != null) {
				try {
					connection.close();
				} catch (Exception ignore) {
				}
			}
		}
	}
}
