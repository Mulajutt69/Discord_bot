import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WebSocketManager');

class WebSocketManager extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.clients = new Map();
    this.serverConnections = new Map();
    this.heartbeatInterval = null;
  }

  initialize(port = process.env.WS_PORT || 8080) {
    this.server = new WebSocket.Server({ 
      port,
      perMessageDeflate: false,
      maxPayload: 1024 * 1024 // 1MB max payload
    });

    this.server.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, {
        ws,
        serverId: null,
        lastPing: Date.now(),
        isAlive: true
      });

      logger.info(`WebSocket client connected: ${clientId}`);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          logger.error(`Invalid message from client ${clientId}:`, error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(clientId);
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
        this.handleDisconnection(clientId);
      });

      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.isAlive = true;
          client.lastPing = Date.now();
        }
      });
    });

    this.startHeartbeat();
    logger.info(`WebSocket server started on port ${port}`);
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'register_server':
        this.registerServerConnection(clientId, message.serverId);
        break;
      case 'message_stream':
        this.emit('message_received', {
          serverId: message.serverId,
          data: message.data,
          clientId
        });
        break;
      case 'analysis_request':
        this.emit('analysis_requested', {
          serverId: message.serverId,
          type: message.analysisType,
          data: message.data,
          clientId
        });
        break;
      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  registerServerConnection(clientId, serverId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.serverId = serverId;
    
    if (!this.serverConnections.has(serverId)) {
      this.serverConnections.set(serverId, new Set());
    }
    
    this.serverConnections.get(serverId).add(clientId);
    
    logger.info(`Client ${clientId} registered for server ${serverId}`);
    
    this.emit('server_registered', { serverId, clientId });
  }

  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (client.serverId) {
      const serverClients = this.serverConnections.get(client.serverId);
      if (serverClients) {
        serverClients.delete(clientId);
        if (serverClients.size === 0) {
          this.serverConnections.delete(client.serverId);
        }
      }
    }

    this.clients.delete(clientId);
    logger.info(`Client ${clientId} disconnected`);
  }

  broadcastToServer(serverId, message) {
    const serverClients = this.serverConnections.get(serverId);
    if (!serverClients) return;

    const messageStr = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    });

    serverClients.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  broadcastToAll(message) {
    const messageStr = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    });

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  startHeartbeat() {
    const interval = parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000;
    
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          logger.warn(`Client ${clientId} failed heartbeat, terminating`);
          client.ws.terminate();
          this.handleDisconnection(clientId);
          return;
        }

        client.isAlive = false;
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      });
    }, interval);
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getServerStats() {
    return {
      totalClients: this.clients.size,
      connectedServers: this.serverConnections.size,
      serverConnections: Array.from(this.serverConnections.entries()).map(([serverId, clients]) => ({
        serverId,
        clientCount: clients.size
      }))
    };
  }

  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.ws.close();
    });

    if (this.server) {
      this.server.close();
    }

    logger.info('WebSocket server shutdown complete');
  }
}

export default new WebSocketManager();