/**
 * WebSocket Connection Indicator
 * Shows connection status in the corner of the screen
 */

import React from 'react';
import { useSocket } from '../context/SocketContext';
import { Wifi, WifiOff } from 'lucide-react';

export default function WebSocketIndicator({ showLabel = false }) {
  const { isConnected } = useSocket();

  return (
    <div
      title={isConnected ? 'Conectado en tiempo real' : 'Sin conexión en tiempo real'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        color: isConnected ? '#10b981' : '#ef4444',
        background: isConnected ? '#d1fae5' : '#fee2e2'
      }}
    >
      {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
      {showLabel && (isConnected ? 'En vivo' : 'Desconectado')}
    </div>
  );
}
