import React, { useState, useEffect, useCallback } from 'react';
import { Layout as AntLayout, Menu, Button, Switch, Space, Badge, Tooltip } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeOutlined,
  HistoryOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  KeyOutlined,
  AppstoreOutlined,
  CloseOutlined
} from '@ant-design/icons';
import './Layout.css';
import WalletConnector from '../common/WalletConnector';
import { useAdmin } from '../../contexts/AdminContext';
import { useAccount } from 'wagmi';

const { Header, Sider, Content, Footer } = AntLayout;

const Layout = ({ children, isDarkMode, toggleTheme }) => {
  // 默认收起菜单栏，无论是移动设备还是宽屏
  const [collapsed, setCollapsed] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { isBridgeOwner, isBridgeValidator, isMultiSigOwner, isMultiSigIniter, loading: adminLoading } = useAdmin();
  
  // 检测屏幕宽度
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // 监听屏幕宽度变化
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 在页面路由变化时自动收起菜单
  useEffect(() => {
    // 如果菜单是展开的，则收起菜单
    if (!collapsed) {
      setCollapsed(true);
    }
  }, [location.pathname]);

  // 切换菜单折叠状态
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };
  
  // 处理菜单项点击，在移动端自动收起菜单
  const handleMenuClick = useCallback((path) => {
    navigate(path);
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile, navigate]);

  // 处理主题切换，使用父组件传递的toggleTheme函数
  const handleThemeToggle = () => {
    toggleTheme();
    // 为了兼容性，仍然保留body上的类
    document.body.classList.toggle('dark-theme', !isDarkMode);
  };

  // 调试输出管理员状态
  console.log('管理员状态:', {
    isBridgeOwner,
    isBridgeValidator,
    isMultiSigOwner,
    isMultiSigIniter,
    adminLoading,
    address
  });

  // 生成菜单项
  const generateMenuItems = () => {
    // 创建菜单项点击处理函数
    const createMenuItem = (path, icon, label, badge = null) => ({
      key: path,
      icon: badge ? <Badge dot={true} offset={[2, 0]}>{icon}</Badge> : icon,
      label: (
        <div className="menu-item-content" onClick={() => handleMenuClick(path)}>
          {label}
        </div>
      )
    });
    
    const baseItems = [
      createMenuItem('/', <HomeOutlined />, '首页'),
      createMenuItem('/deposit', <ArrowDownOutlined />, '存款 (Magnet → BSC)'),
      createMenuItem('/withdraw', <ArrowUpOutlined />, '提款 (BSC → Magnet)'),
      createMenuItem('/history', <HistoryOutlined />, '交易历史'),
    ];
    
    // 如果用户是跨链桥管理员或验证者，添加跨链桥管理页面
    if (isBridgeOwner) {
      baseItems.push(
        createMenuItem('/bridge-admin', <SettingOutlined />, '跨链桥管理', true)
      );
    }
    
    // 如果用户是多签钱包的所有者或初始创建者，添加多签钱包管理页面
    if (isMultiSigOwner) {
      baseItems.push(
        createMenuItem('/multisig-admin', <KeyOutlined />, '多签钱包管理', true)
      );
    }
    
    return baseItems;
  };
  
  const menuItems = generateMenuItems();

  return (
    <AntLayout className={`layout-container ${isDarkMode ? 'dark-theme' : ''}`}>
      <Header className="header">
        <div className="header-container">
          <div className="header-left">
            <div className="logo">
              <Link to="/">
                <h1 className="logo-text">MAG跨链桥</h1>
              </Link>
            </div>
          </div>
          <div className="header-right">
            <div className="theme-switch">
              <Switch 
                checkedChildren="🌙" 
                unCheckedChildren="☀️" 
                checked={isDarkMode} 
                onChange={handleThemeToggle}
                size="small"
              />
            </div>
            <div className="wallet-container">
              <WalletConnector />
            </div>
          </div>
        </div>
      </Header>
      <AntLayout>
        <Sider 
          width={230}
          collapsible
          collapsed={collapsed}
          collapsedWidth={0}
          className="site-layout-sider"
          trigger={null}
        >
          <div className="menu-header">
            <h3 className="menu-title">导航菜单</h3>
            <Tooltip title="">
              <Button 
                type="text" 
                className="menu-close-button"
                icon={<CloseOutlined />} 
                onClick={toggleCollapsed} 
                size="small"
              />
            </Tooltip>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            className="side-menu"
            theme={isDarkMode ? 'dark' : 'light'}
          />
        </Sider>
        <AntLayout>
          <Tooltip title={collapsed ? '' : ''}>
            <Button
              className="trigger-button"
              type="primary"
              shape="circle"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
              size={isMobile ? 'middle' : 'large'}
            />
          </Tooltip>
          <Content className="main-content">
            <div className="container">{children}</div>
          </Content>
          <Footer className="footer">
            <div>MAG跨链桥 &copy; {new Date().getFullYear()} - 连接Magnet POW链和币安智能链的跨链解决方案</div>
          </Footer>
        </AntLayout>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;
