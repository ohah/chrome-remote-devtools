import { Link } from 'react-router-dom';
import './HomePage.css';

// Home page / 홈 페이지
function HomePage() {
  return (
    <div className="home-page">
      <h1>Chrome Remote DevTools Test</h1>
      <p>
        Select a test page to verify CDP domain functionality / CDP 도메인 기능을 확인할 테스트
        페이지를 선택하세요
      </p>
      <div className="test-links">
        <Link to="/console" className="test-link">
          <h2>Console</h2>
          <p>Test console logging and messages / 콘솔 로깅 및 메시지 테스트</p>
        </Link>
        <Link to="/network" className="test-link">
          <h2>Network</h2>
          <p>Test network requests (fetch, XHR) / 네트워크 요청 테스트 (fetch, XHR)</p>
        </Link>
        <Link to="/storage" className="test-link">
          <h2>Storage</h2>
          <p>Test localStorage and sessionStorage / localStorage 및 sessionStorage 테스트</p>
        </Link>
        <Link to="/assert" className="test-link">
          <h2>Assert</h2>
          <p>Test assertions with es-toolkit / es-toolkit을 사용한 assertion 테스트</p>
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
