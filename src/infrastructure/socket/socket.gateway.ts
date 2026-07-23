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
import { JwtProvider } from '@/utils/jwt.util';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true,
  },
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
    const authToken = client.handshake.auth?.token;
    const queryToken = client.handshake.query?.token;
    const authorization = client.handshake.headers?.authorization;

    const token =
      (typeof authToken === 'string' && authToken.trim() ? authToken : undefined) ||
      (typeof queryToken === 'string' && queryToken.trim() ? queryToken : undefined) ||
      (typeof authorization === 'string' && authorization.startsWith('Bearer ')
        ? authorization.slice(7).trim()
        : undefined);

    if (!token) {
      this.logger.warn(`Client ${client.id} rejected: missing token`);
      client.disconnect(true);
      return;
    }

    const payload = JwtProvider.verifyToken(token, process.env.ACCESS_TOKEN_SECRET!);
    if (!payload) {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.disconnect(true);
      return;
    }

    client.data.userId = payload.id;
    client.data.userRole = payload.role;
    client.join(`user:${payload.id}`);
    this.logger.log(`Client connected: ${client.id} | userId: ${payload.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-venue')
  handleJoinVenue(client: Socket, venueId: string) {
    if (!client.data.userId) {
      return;
    }

    client.join(`venue:${venueId}`);
    this.logger.log(`Client ${client.id} joined venue room: ${venueId}`);
  }

  @SubscribeMessage('leave-venue')
  handleLeaveVenue(client: Socket, venueId: string) {
    client.leave(`venue:${venueId}`);
  }

  @SubscribeMessage('join-conversation')
  handleJoinConversation(client: Socket, conversationId: string) {
    if (!client.data.userId || !conversationId) {
      return;
    }

    client.join(`chat:${conversationId}`);
    this.logger.log(`Client ${client.id} joined chat room: ${conversationId}`);
  }

  @SubscribeMessage('leave-conversation')
  handleLeaveConversation(client: Socket, conversationId: string) {
    client.leave(`chat:${conversationId}`);
  }

  emitChatMessage(conversationId: string, message: any) {
    this.server.to(`chat:${conversationId}`).emit('chat:message', message);
  }

  sendNotificationToUser(
    userId: string,
    payload: { title: string; message: string; type?: string; payload?: any },
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
