/**
 * Socket.IO namespaces:
 * /actors
 * /session-status
 */

import { Server } from 'http';
import { sessionSettings } from './express-session';
import * as socketIo from 'socket.io';

let io: SocketIO.Server = null;
let ioActorsNs: SocketIO.Namespace = null
let ioSessionStatusNs: SocketIO.Namespace = null

export function initialize(httpServer: Server) {
    if (io) return;

    io = socketIo(httpServer);

    const ioSession = require('socket.io-express-session');
    io.use(ioSession(sessionSettings));

    io.on('connection', function (socket) {
        const session = (socket.handshake as any).session;
        if (session && session.id) {
            console.log('Established WebSocket connection for session ' + session.id);
        }
    });

    ioActorsNs = io.of('/actors');
    ioSessionStatusNs = io.of('/session-status');
}


export function onActorsChanged(actorId: number) {
    if (!io) return;

    ioActorsNs.emit('actors-changed', {
        actorId: actorId
    });
}

export function onSessionStatusChanged(sessionId: number, newStatus: string) {
    if (!io) return;

    ioSessionStatusNs.emit('status-changed', {
        sessionId: sessionId,
        newStatus: newStatus
    });
}

interface IProgress {
    testsTotal: number,
    testsComplete: number,
    testsPassed: number
}

export function onSessionProgress(sessionId: number, eventData?: IProgress) {
    if (!io) return;

    ioSessionStatusNs.emit('progress', {
        sessionId: sessionId,
        ...eventData
    });
}