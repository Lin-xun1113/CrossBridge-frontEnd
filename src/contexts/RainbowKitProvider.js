import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config, chains } from '../config/rainbowkit';

// u521bu5efaQueryClient
const queryClient = new QueryClient();

/**
 * u94b1u5305u8fdeu63a5u6309u94aeu7ec4u4ef6
 */
export const WalletConnector = () => {
  return (
    <ConnectButton 
      label="u8fdeu63a5u94b1u5305" 
      accountStatus="full" 
      chainStatus="full" 
      showBalance={true}
    />
  );
};

/**
 * RainbowKitu63d0u4f9bu8005u7ec4u4ef6
 * u5c06u6574u4e2au5e94u7528u5305u88f9u5728RainbowKitu63d0u4f9bu8005u4e2d
 */
export const RainbowProvider = ({ children }) => {
  // 使用单一链配置，避免多链引起的初始化问题
  const bscTestnetChain = [chains[1]]; // 只使用BSC测试网
  
  // 检测当前主题模式
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    // 从localStorage读取用户偏好，如果没有则使用系统偏好
    const savedMode = localStorage.getItem('theme-mode');
    if (savedMode) return savedMode === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  // 监听主题变化
  React.useEffect(() => {
    const handleThemeChange = () => {
      const bodyHasDarkClass = document.body.classList.contains('dark-theme');
      setIsDarkMode(bodyHasDarkClass);
    };
    
    // 创建MutationObserver监听body类名变化
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    // 初始检查
    handleThemeChange();
    
    return () => observer.disconnect();
  }, []);

  // 使用try-catch包裹组件，防止渲染错误导致整个应用崩溃
  try {
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider 
            chains={bscTestnetChain} 
            initialChain={97}
            modalSize="compact"
            showRecentTransactions={true}
            appInfo={{
              appName: 'MAG跨链桥',
              learnMoreUrl: 'https://magnet.magswap.io',
            }}
          >
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  } catch (error) {
    console.error('RainbowKit提供者初始化错误:', error);
    // 返回降级UI，确保应用不会崩溃
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>钱包连接组件加载失败</h2>
        <p>请刷新页面或联系管理员</p>
        {children}
      </div>
    );
  }
};

export default RainbowProvider;
