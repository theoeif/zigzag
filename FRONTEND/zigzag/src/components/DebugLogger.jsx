import React, { useState, useEffect } from 'react';

// Override console methods to capture logs
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

const DebugLogger = ({ enabled = true }) => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!enabled) return;

    const addLog = (type, args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      setLogs(prev => [...prev.slice(-49), { type, message, time: new Date().toLocaleTimeString() }]);
    };

    console.log = (...args) => {
      originalConsole.log(...args);
      addLog('log', args);
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      addLog('error', args);
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      addLog('warn', args);
    };

    console.info = (...args) => {
      originalConsole.info(...args);
      addLog('info', args);
    };

    return () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        width: '300px',
        maxHeight: '400px',
        backgroundColor: 'rgba(0,0,0,0.9)',
        color: '#0f0',
        fontSize: '10px',
        padding: '10px',
        overflow: 'auto',
        zIndex: 99999,
        fontFamily: 'monospace',
        borderRadius: '5px',
        boxShadow: '0 0 10px rgba(0,0,0,0.5)'
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#fff' }}>
        Debug Console ({logs.length} logs)
      </div>
      {logs.map((log, idx) => (
        <div
          key={idx}
          style={{
            color: log.type === 'error' ? '#f00' : log.type === 'warn' ? '#ff0' : '#0f0',
            marginBottom: '2px',
            wordBreak: 'break-word'
          }}
        >
          [{log.time}] {log.message}
        </div>
      ))}
    </div>
  );
};

export default DebugLogger;
