import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import './WalletConnector.css';

/**
 * 使用RainbowKit的钱包连接组件
 * 直接使用RainbowKit提供的ConnectButton组件，它具有完整的钱包连接UI和功能
 */
const WalletConnector = () => {
  // 使用媒体查询检测屏幕大小
  const [screenSize, setScreenSize] = React.useState('large');

  React.useEffect(() => {
    // 初始化检测屏幕大小
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width <= 400) {
        setScreenSize('xs');  // 超小屏幕
      } else if (width <= 576) {
        setScreenSize('small');  // 小屏幕
      } else if (width <= 768) {
        setScreenSize('medium');  // 中屏幕
      } else {
        setScreenSize('large');  // 大屏幕
      }
    };
    
    // 首次执行检测
    checkScreenSize();
    
    // 添加事件监听器
    window.addEventListener('resize', checkScreenSize);
    
    // 清理函数
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 根据屏幕尺寸调整组件属性
  let connectorClassName = "wallet-connector";
  let accountStatus = 'full';
  let chainStatus = 'full';
  let showBalance = true;
  
  // 根据屏幕尺寸调整
  if (screenSize === 'xs') {
    // 超小屏幕上使用最紧凑的模式
    connectorClassName += " wallet-connector-xs";
    accountStatus = 'address';
    chainStatus = 'none';  // 超小屏幕上隐藏链状态
    showBalance = false;
  } else if (screenSize === 'small') {
    // 小屏幕上使用紧凑模式
    connectorClassName += " wallet-connector-small";
    accountStatus = 'address';
    chainStatus = 'icon';
    showBalance = false;
  } else if (screenSize === 'medium') {
    // 中屏幕上使用缩减模式
    connectorClassName += " wallet-connector-medium";
    accountStatus = 'avatar';
    chainStatus = 'icon';
    showBalance = true;
  }
  
  return (
    <div className={connectorClassName}>
      <ConnectButton
        label="连接钱包"
        accountStatus={accountStatus}
        chainStatus={chainStatus}
        showBalance={showBalance}
      />
    </div>
  );
};

export default WalletConnector;
