import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      client.join(`user:${userId}`);
      this.logger.log(`Client connected: ${client.id} | userId: ${userId}`);
    } else {
      this.logger.log(`Client connected: ${client.id} (unauthenticated)`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-venue')
  handleJoinVenue(client: Socket, venueId: string) {
    client.join(`venue:${venueId}`);
    this.logger.log(`Client ${client.id} joined venue room: ${venueId}`);
  }

  @SubscribeMessage('leave-venue')
  handleLeaveVenue(client: Socket, venueId: string) {
    client.leave(`venue:${venueId}`);
  }

  sendNotificationToUser(
    userId: string,
    payload: { title: string; message: string; type?: string },
  ) {
    this.server.to(`user:${userId}`).emit('notification', payload);
  }

  sendBookingStatusUpdate(
    userId: string,
    payload: { bookingId: string; status: string; fieldName: string },
  ) {
    this.server.to(`user:${userId}`).emit('booking-status', payload);
  }

  broadcastToVenue(venueId: string, event: string, payload: unknown) {
    this.server.to(`venue:${venueId}`).emit(event, payload);
  }

  broadcastAll(event: string, payload: unknown) {
    this.server.emit(event, payload);
  }
}
