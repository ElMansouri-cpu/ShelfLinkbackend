// src/orders/orders.gateway.ts
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  
  @WebSocketGateway({
    cors: {
      origin: '*',
    },
  })
  export class OrdersGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    afterInit(server: Server) {
      console.log('WebSocket Initialized');
    }
  
    handleConnection(client: Socket) {
      console.log(`Client connected: ${client.id}`);
    }
  
    handleDisconnect(client: Socket) {
      console.log(`Client disconnected: ${client.id}`);
    }
  
    @SubscribeMessage('trackOrder')
    handleTrackOrder(client: Socket, data: { orderId: string }) {
      client.join(`order-${data.orderId}`);
      client.emit('joinedRoom', `order-${data.orderId}`);
    }
  
    emitOrderStatus(orderId: string, status: string) {
      this.server.to(`order-${orderId}`).emit('orderStatus', { orderId, status });
    }
  }
  