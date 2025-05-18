import React from 'react';
import { Typography, Row, Col, Card, Statistic, Button, Alert, Spin } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAccount, useChainId } from 'wagmi';
import { useBridge } from '../contexts/BridgeContext';

const { Title, Paragraph } = Typography;

const HomePage = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { bridgeStatus, loadingStatus } = useBridge();
  
  // 获取网络名称
  const getNetworkName = () => {
    if (!chainId) return '';
    
    switch(chainId) {
      case 56:
        return 'BSC';
      case 97:
        return 'BSC测试网';
      case 114514:
        return 'Magnet POW';
      default:
        return '未知网络';
    }
  };
  
  const networkName = getNetworkName();

  return (
    <div className="home-page">
      <Title level={2} className="page-title">
        MAG跨链桥
      </Title>
      
      <Paragraph>
        欢迎使用MAG跨链桥，这是连接Magnet POW链和币安智能链(BSC)的去中心化跨链解决方案。
        您可以在两条链之间无缝转移MAG代币，您的MAG跨链过程及原链资产将由多签钱包与多个验证者节点共同守护，保证您资产的安全性和流动性。（注：BSCTestnet的RPC URL为https://data-seed-prebsc-1-s1.binance.org:8545/ ；链ID 97 对应代币地址为0xd95fc74a2a6C7ea18B4C0eEfb3592E6B9c5a552D
      </Paragraph>
      
      {!isConnected && (
        <Alert
          type="info"
          message="请连接您的钱包"
          description="要开始使用MAG跨链桥，请先连接您的MetaMask钱包。"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}
      
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card title="跨链桥状态" variant="borderless">
            {loadingStatus ? (
              <div className="center-spin">
                <Spin size="large" tip="加载中..." />
              </div>
            ) : bridgeStatus ? (
              <div>
                <div className="status-item">
                  <span className="status-label">运行状态：</span>
                  <span className={`status-value ${bridgeStatus.paused ? 'danger' : 'success'}`}>
                    {bridgeStatus.paused ? '已暂停' : '正常运行'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">手续费率：</span>
                  <span className="status-value">{bridgeStatus.feePercentage}%</span>
                </div>
                <div className="status-item">
                  <span className="status-label">单笔最大限额：</span>
                  <span className="status-value">
                    {parseFloat(bridgeStatus.maxAmount) > 100000000000 ? '无限额' : parseFloat(bridgeStatus.maxAmount).toLocaleString() + ' MAG'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">每日使用情况：</span>
                  <span className="status-value">
                    {isNaN(parseFloat(bridgeStatus.dailyUsed)) ? '0' : parseFloat(bridgeStatus.dailyUsed).toLocaleString()} / 
                    {parseFloat(bridgeStatus.dailyLimit) > 100000000000 ? '无限额' : parseFloat(bridgeStatus.dailyLimit).toLocaleString() + ' MAG'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="placeholder-text">
                {isConnected && networkName !== 'BSC测试网' 
                  ? '请切换到BSC测试网查看跨链桥状态' 
                  : '连接钱包以查看跨链桥状态'}
              </div>
            )}
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="操作指南" variant="borderless">
            <p>选择您需要的跨链操作：</p>
            <div className="guide-buttons">
              <Link to="/deposit">
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<ArrowDownOutlined />}
                  block
                  style={{ marginBottom: 16 }}
                >
                  存款 (Magnet → BSC)
                </Button>
              </Link>
              <Link to="/withdraw">
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<ArrowUpOutlined />}
                  block
                >
                  提款 (BSC → Magnet)
                </Button>
              </Link>
            </div>
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title="最低存款金额要求" variant="borderless">
            <Statistic 
              title="单笔最低存款额度" 
              value={10000} 
              suffix="MAG" 
              precision={0} 
            />
            <Paragraph style={{ marginTop: 16 }}>
              为了确保交易的经济性，单笔跨链金额不能低于10000 MAG。（因为跨链存款转账过程验证者节点需支付部分Gas费和手续费，
              过小的金额会导致手续费开销占比过高。）
            </Paragraph>
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title="使用流程" variant="borderless">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title="存款流程 (Magnet → BSC)" variant="borderless" type="inner">
                  <ol>
                    <li>连接Magnet POW链钱包</li>
                    <li>选择存款金额（不低于10000 MAG）</li>
                    <li>提交交易并等待确认</li>
                    <li>等待足够的区块确认（约3-5分钟）</li>
                    <li>确认完成后，MAG代币将出现在您的BSC钱包中</li>
                  </ol>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="提款流程 (BSC → Magnet)" variant="borderless" type="inner">
                  <ol>
                    <li>连接BSC测试网钱包</li>
                    <li>输入提款金额和Magnet链上的接收地址</li>
                    <li>授权桥接合约使用您的MAG代币</li>
                    <li>提交提款请求</li>
                    <li>等待多签验证者确认（约10-15分钟）</li>
                    <li>确认完成后，MAG将发送到您的Magnet地址</li>
                  </ol>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      
    </div>
  );
};

export default HomePage;
