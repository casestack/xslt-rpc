package com.casestack;

import com.casestack.RabbitRPC;

public class Main {
    public static void main(String[] args) throws Exception {
    	RabbitRPC rabbit = new RabbitRPC();
    	rabbit.startListening();
    }
}