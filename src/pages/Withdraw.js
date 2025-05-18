import React, { useState, useEffect } from 'react';
import { 
  Typography, Form, Input, Button, Alert, 
  Card, Statistic, Progress, Divider, Space, message
} from 'antd';
import { useAccount, useChainId, useSwitchChain, useBalance } from 'wagmi';
import { ReloadOutlined, LinkOutlined, SyncOutlined } from '@ant-design/icons';
import { useBridge } from '../contexts/BridgeContext';

const { Title, Paragraph, Text } = Typography;

const WithdrawPage = () => {
  const [amount, setAmount] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState('');
  const [txStatus, setTxStatus] = useState(null);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [fee, setFee] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: tokenBalanceData } = useBalance({ 
    address,
    // BSC测试网上MAG代币地址
    token: chainId === 97 ? '0xd95fc74a2a6C7ea18B4C0eEfb3592E6B9c5a552D' : undefined, // 这里需要替换为实际的代币地址
  });

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
  const tokenBalance = tokenBalanceData?.formatted || '0';
  const { bridgeStatus, withdraw, calculateFee, checkTransactionStatus } = useBridge();

  // 当钱包连接时，自动填写当前地址为接收地址
  useEffect(() => {
    if (isConnected && address && !receiverAddress) {
      setReceiverAddress(address);
    }
  }, [isConnected, address, receiverAddress]);

  // 监听金额变化，计算费用
  useEffect(() => {
    if (amount && !isNaN(parseFloat(amount))) {
      const amountValue = parseFloat(amount);
      const feeValue = calculateFee(amountValue);
      setFee(feeValue);
      setNetAmount(amountValue - feeValue);
    } else {
      setFee(0);
      setNetAmount(0);
    }
  }, [amount, calculateFee]);

  // 监控交易状态
  useEffect(() => {
    if (!txHash) return;

    const intervalId = setInterval(async () => {
      try {
        const status = await checkTransactionStatus(txHash, 'withdraw');
        setTxStatus(status);
        
        // 如果交易完成或失败，停止轮询
        if (['completed', 'failed'].includes(status.status)) {
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error('获取交易状态失败:', error);
      }
    }, 5000); // 每5秒查询一次

    return () => clearInterval(intervalId);
  }, [txHash, checkTransactionStatus]);

  // 刷新交易状态
  const refreshTxStatus = async () => {
    if (!txHash) return;
    
    try {
      setRefreshingStatus(true);
      const updatedStatus = await checkTransactionStatus(txHash, 'withdraw');
      setTxStatus(updatedStatus);
      message.info('交易状态已刷新');
    } catch (error) {
      console.error('刷新交易状态失败:', error);
      message.error('刷新交易状态失败');
    } finally {
      setRefreshingStatus(false);
    }
  };

  // 处理提款
  const handleWithdraw = async () => {
    try {
      // 重置错误状态
      setError(null);
      
      // 验证钱包连接
      if (!isConnected) {
        setError('请先连接钱包');
        return;
      }
      
      // 验证网络
      if (networkName !== 'BSC测试网') {
        // 注意：switchChain需要传入链 ID 而不是名称
        const switched = await switchChain({ chainId: 97 });
        if (!switched) {
          setError('请切换到BSC测试网网络');
          return;
        }
      }
      
      // 验证金额
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        setError('请输入有效金额');
        return;
      }
      
      // 验证接收地址
      if (!receiverAddress || receiverAddress.length < 42) {
        setError('请输入有效的Magnet接收地址');
        return;
      }
      
      // 验证余额
      const balanceValue = parseFloat(tokenBalance);
      if (balanceValue < amountValue) {
        setError('余额不足');
        return;
      }
      
      // 开始加载
      setLoading(true);
      
      // 执行提款
      const hash = await withdraw(receiverAddress, amount);
      if (hash) {
        setTxHash(hash);
        
        // 获取初始交易状态
        const status = await checkTransactionStatus(hash, 'withdraw');
        setTxStatus(status);
      }
    } catch (error) {
      console.error('提款失败:', error);
      setError('提款失败: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="withdraw-page">
      <Title level={2} className="page-title">提款 (BSC → Magnet)</Title>
      
      <Paragraph>
        将MAG从BSC链转移回Magnet POW链。在BSC链上销毁MAG代币，验证后将在Magnet链上释放对应数量的MAG（扣除手续费后）。
      </Paragraph>
      
      {!isConnected && (
        <Alert
          type="info"
          message="请连接您的钱包"
          description="要进行提款操作，请先连接您的MetaMask钱包。"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}
      
      {isConnected && networkName !== 'BSC测试网' && (
        <Alert
          type="warning"
          message="网络不匹配"
          description="提款操作需要连接到BSC测试网网络，请切换网络。"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}
      
      {bridgeStatus && bridgeStatus.paused && (
        <Alert
          type="error"
          message="跨链桥已暂停"
          description="跨链桥当前处于暂停状态，暂不能进行提款操作。请稍后再试。"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}
      
      <Card className="card-container">
        <Form layout="vertical">
          <Form.Item label="提款金额 (MAG)">
            <Input
              placeholder="请输入提款金额"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              suffix="MAG"
              disabled={loading || !isConnected || networkName !== 'BSC测试网'}
            />
            {tokenBalance && (
              <div className="balance-info">BSC上MAG余额: {tokenBalance} MAG</div>
            )}
          </Form.Item>
          
          <Form.Item label="接收地址 (Magnet)">
            <Input
              placeholder="请输入Magnet链上的接收地址"
              value={receiverAddress}
              onChange={e => setReceiverAddress(e.target.value)}
              disabled={loading}
            />
            <div className="hint">请确保输入正确的Magnet POW链地址，错误的地址可能导致资产丢失</div>
          </Form.Item>
          
          {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
            <div className="fee-info">
              <Statistic title="手续费" value={fee.toFixed(4)} suffix="MAG" />
              <Statistic title="实际到账" value={netAmount.toFixed(4)} suffix="MAG" />
              <Statistic title="预计完成时间" value="10-15分钟" />
            </div>
          )}
          
          <Divider />
          
          <div className="form-actions">
            <Space>
              <Button
                type="primary"
                onClick={handleWithdraw}
                loading={loading}
                disabled={
                  !isConnected || 
                  networkName !== 'BSC测试网' || 
                  !amount || 
                  isNaN(parseFloat(amount)) || 
                  parseFloat(amount) <= 0 ||
                  !receiverAddress ||
                  receiverAddress.length < 42 ||
                  (bridgeStatus && bridgeStatus.paused)
                }
              >
                确认提款
              </Button>
              {networkName !== 'BSC测试网' && isConnected && (
                <Button onClick={() => switchChain({ chainId: 97 })}>切换到BSC测试网</Button>
              )}
            </Space>
          </div>
        </Form>
        
        {error && (
          <Alert
            type="error"
            message="操作失败"
            description={error}
            showIcon
            style={{ marginTop: 24 }}
            closable
            onClose={() => setError(null)}
          />
        )}
        
        {txHash && (
          <div className="transaction-info">
            <Title level={4}>交易详情</Title>
            
            <div className="tx-info-item">
              <Text strong>交易哈希: </Text>
              <Text copyable={{ text: txHash }}>{txHash}</Text>
            </div>
            
            {txStatus && (
              <>
                <div className="tx-info-item">
                  <Text strong>状态: </Text>
                  <Space>
                    <Text>
                      {txStatus.status === 'pending' && '等待中'}
                      {txStatus.status === 'verifying' && '验证中'}
                      {txStatus.status === 'executing' && '执行中'}
                      {txStatus.status === 'completed' && '已完成'}
                      {txStatus.status === 'failed' && '失败'}
                    </Text>
                    <Button 
                      type="link" 
                      size="small"
                      icon={<SyncOutlined />}
                      loading={refreshingStatus}
                      onClick={refreshTxStatus}
                    >
                      刷新状态
                    </Button>
                  </Space>
                </div>
                
                {txStatus.multiSigInfo && (
                  <div className="tx-info-item">
                    <Text strong>验证者确认: </Text>
                    <div style={{ width: '100%', maxWidth: 400, marginTop: 8 }}>
                      <Progress 
                        percent={Math.min(100, Math.round(txStatus.multiSigInfo.confirmations.length / 3 * 100))}
                        format={() => `${txStatus.multiSigInfo.confirmations.length}/3`}
                        status={txStatus.status === 'failed' ? 'exception' : undefined}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            
            <div className="tx-help-text">
              <Text type="secondary">
                提款过程需要多签验证者确认，大约需要10-15分钟。确认完成后，MAG将发送到您指定的Magnet地址。
              </Text>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WithdrawPage;
