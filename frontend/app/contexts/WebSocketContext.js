import { createContext, useContext, useEffect, useRef, useState } from 'react';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    // Return a safe fallback instead of throwing an error
    console.warn('useWebSocket used outside WebSocketProvider, returning fallback');
    return {
      isConnected: false,
      subscribe: () => () => {}, // Return a no-op unsubscribe function
      unsubscribe: () => {},
      connect: () => {},
      disconnect: () => {}
    };
  }
  return context;
};

export const WebSocketProvider = ({ children, workspaceId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const listenersRef = useRef(new Map());
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!workspaceId) return;
    
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://socialsync-j7ih.onrender.com';
      const wsUrl = API_BASE_URL.replace(/^http/, 'ws').replace(/^https/, 'wss').replace('/api', '');
      
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      // Add safety check for WebSocket support
      if (typeof window === 'undefined' || !window.WebSocket) {
        console.warn('WebSocket not supported in this environment');
        return;
      }
      
      wsRef.current = new window.WebSocket(`${wsUrl}/ws/${workspaceId}`);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected for workspace:', workspaceId);
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log('WebSocket received message:', msg);
          // Broadcast to all listeners
          listenersRef.current.forEach((callback) => {
            try {
              callback(msg);
            } catch (error) {
              console.warn('WebSocket listener error:', error);
            }
          });
        } catch (error) {
          console.warn('WebSocket message parsing error:', error);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.warn('WebSocket error:', error);
        // Don't let WebSocket errors crash the app
        setIsConnected(false);
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket closed for workspace:', workspaceId);
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('Max reconnection attempts reached');
        }
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    listenersRef.current.clear();
  };

  const subscribe = (callback) => {
    const id = Math.random().toString(36).substr(2, 9);
    listenersRef.current.set(id, callback);
    
    return () => {
      listenersRef.current.delete(id);
    };
  };

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [workspaceId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const value = {
    isConnected,
    subscribe,
    connect,
    disconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
