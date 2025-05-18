import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './App.css';

// 导入上下文提供程序
import { RainbowProvider } from './contexts/RainbowKitProvider';
import { BridgeProvider } from './contexts/BridgeContext';
import { AdminProvider } from './contexts/AdminContext';

// 导入页面组件
import Layout from './components/layout/Layout';
import HomePage from './pages/Home';
import DepositPage from './pages/Deposit';
import WithdrawPage from './pages/Withdraw';
import HistoryPage from './pages/History';
import BridgeAdmin from './pages/BridgeAdmin';
import MultiSigAdmin from './pages/MultiSigAdmin';

function App() {
  // 使用React的useState钩子来管理当前主题模式
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    // 从localStorage读取用户偏好，如果没有则使用系统偏好
    const savedMode = localStorage.getItem('theme-mode');
    if (savedMode) return savedMode === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // 主题切换函数
  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme-mode', newMode ? 'dark' : 'light');
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#3498db',
          // 增强夜间模式下的文本对比度
          colorTextBase: isDarkMode ? '#ffffff' : undefined,
          colorTextSecondary: isDarkMode ? '#cccccc' : undefined,
        },
      }}
    >
      <Router>
        <RainbowProvider>
          <BridgeProvider>
            <AdminProvider>
              <div className="App">
                <Layout isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/deposit" element={<DepositPage />} />
                    <Route path="/withdraw" element={<WithdrawPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/bridge-admin" element={<BridgeAdmin />} />
                    <Route path="/multisig-admin" element={<MultiSigAdmin />} />
                  </Routes>
                </Layout>
              </div>
            </AdminProvider>
          </BridgeProvider>
        </RainbowProvider>
      </Router>
    </ConfigProvider>
  );
}

export default App;
