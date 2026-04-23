import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (topic: string) => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const socket = io('http://localhost:8000'); // URL của Backend sau này

    socket.on(topic, (newData) => {
      setData((prev) => [newData, ...prev].slice(0, 20)); // Giữ 20 bản ghi mới nhất
    });

    return () => { socket.disconnect(); };
  }, [topic]);

  return data;
};