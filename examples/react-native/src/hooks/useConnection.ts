/**
 * Connection hook / 연결 훅
 * @format
 */

import { useEffect } from 'react';
import ChromeRemoteDevToolsInspector from '@ohah/chrome-remote-devtools-react-native';

export const useConnection = () => {
  // Connect to Chrome Remote DevTools server on app start / 앱 시작 시 Chrome Remote DevTools 서버에 연결
  useEffect(() => {
    // Debug: Check if module is available / 디버그: 모듈이 사용 가능한지 확인
    console.log('🔍 Checking ChromeRemoteDevToolsInspector module...');
    console.log('Module:', ChromeRemoteDevToolsInspector);

    // Connect to server / 서버에 연결
    // For iOS Simulator: use "localhost" / iOS 시뮬레이터: "localhost" 사용
    // For physical device: use your computer's IP address / 실제 기기: 컴퓨터의 IP 주소 사용
    console.log('🔌 Attempting to connect to localhost:8080...');
    ChromeRemoteDevToolsInspector.connect('localhost', 8080)
      .then((result: unknown) => {
        console.log('✅ Chrome Remote DevTools Inspector connected to localhost:8080');
        console.log('Connection result:', result);
      })
      .catch((error: unknown) => {
        console.error('❌ Failed to connect to Chrome Remote DevTools Inspector:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          name: error instanceof Error ? error.name : undefined,
        });
      });
  }, []);
};
