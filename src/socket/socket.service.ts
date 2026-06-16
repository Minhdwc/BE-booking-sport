// src/socket/socket.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { JwtProvider } from '../providers/jwt.provider'

type SocketUser = {
  id: string
  email: string
  username: string
  role: string
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3002',
      'https://labone.net.vn',
      'http://labone.net.vn',
      'https://www.labone.net.vn',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  transports: ['websocket', 'polling'],
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  io!: Server
  private readonly logger = new Logger(SocketGateway.name)

  handleConnection(socket: Socket) {
    const token = this.extractToken(socket)
    if (!token) {
      this.logger.warn(`Socket ${socket.id} rejected: missing token`)
      socket.disconnect(true)
      return
    }

    const user = JwtProvider.verifyToken(token, process.env.ACCESS_TOKEN_SECRET!)
    if (!user) {
      this.logger.warn(`Socket ${socket.id} rejected: invalid token`)
      socket.disconnect(true)
      return
    }

    socket.data.user = user
    socket.join(this.getUserRoom(user.id))
    this.logger.log(`Socket ${socket.id} authenticated for user ${user.id}`)
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Socket ${socket.id} disconnected`)
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() room: string,
  ) {
    const user = socket.data.user as SocketUser | undefined
    if (!user) {
      socket.emit('error', { message: 'Unauthorized socket session' })
      socket.disconnect(true)
      return
    }

    const expectedRoom = this.getUserRoom(user.id)
    if (room !== expectedRoom) {
      socket.emit('error', { message: 'Forbidden room' })
      this.logger.warn(`Socket ${socket.id} tried to join forbidden room ${room}`)
      return
    }

    socket.join(expectedRoom)
    this.logger.log(`Socket ${socket.id} joined room ${expectedRoom}`)
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.io.to(this.getUserRoom(userId)).emit(event, payload)
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`
  }

  private extractToken(socket: Socket) {
    const authToken = socket.handshake.auth?.token
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken
    }

    const authorization = socket.handshake.headers.authorization
    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
      return authorization.split(' ')[1]
    }

    return null
  }
}