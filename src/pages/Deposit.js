import React, { useState, useEffect } from 'react';
import { 
  Typography, Form, Input, Button, Alert, 
  Card, Statistic, Progress, Divider, Space 
} from 'antd';
import { useAccount, useChainId, useBalance, useSwitchChain } from 'wagmi';
import { useBridge } from '../contexts/BridgeContext';

const { Title, Paragraph, Text } = Typography;

const DepositPage = () => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [fee, setFee] = useState(0);
  const [netAmount, setNetAmount] = useState(0);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const { switchChain } = useSwitchChain();
  const { bridgeStatus, deposit, calculateFee, checkTransactionStatus } = useBridge();
  
  // 获取网络名称
  const getNetworkName = () => {
    if (!chainId) return '';
    
    switch(chainId) {
      case 56:
        return 'BSC';
      case 97:
        return 'BSC测试网';
      case 114514:
        return 'Magnet POW链';
      default:
        return '未知网络';
    }
  };
  
  const networkName = getNetworkName();
  const nativeBalance = balance?.formatted || '0';

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
        const status = await checkTransactionStatus(txHash, 'deposit');
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

  // 处理存款
  const handleDeposit = async () => {
    try {
      // 重置错误状态
      setError(null);
      
      // 验证钱包连接
      if (!isConnected) {
        setError('请先连接钱包');
        return;
      }
      
      // 验证网络
      if (networkName !== 'Magnet POW链') {
        // 注意：switchChain需要传入链 ID 而不是名称
        const switched = await switchChain({ chainId: 114514 });
        if (!switched) {
          setError('请切换到Magnet POW链网络');
          return;
        }
      }
      
      // 验证金额
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        setError('请输入有效金额');
        return;
      }
      
      // 验证最小金额（10000 MAG）
      if (amountValue < 10000) {
        setError('存款金额不能小于10000 MAG');
        return;
      }
      
      // 验证余额
      const balanceValue = parseFloat(nativeBalance);
      if (balanceValue < amountValue) {
        setError('余额不足');
        return;
      }
      
      // 开始加载
      setLoading(true);
      
      // 执行存款
      const hash = await deposit(amount);
      if (hash) {
        setTxHash(hash);
        
        // 获取初始交易状态
        const status = await checkTransactionStatus(hash, 'deposit');
        setTxStatus(status);
      }
    } catch (error) {
      console.error('存款失败:', error);
      setError('存款失败: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deposit-page">
      <Title level={2} className="page-title">存款 (Magnet → BSC)</Title>
      
      <Paragraph>
        将MAG从Magnet POW链转移到BSC链。在Magnet链上发送MAG到指定地址，验证后将在BSC链上铸造等量的MAG代币（扣除手续费后）。
      </Paragraph>
      
      {!isConnected && (
        <Alert
          type="info"
          message="请连接您的钱包"
          description="要进行存款操作，请先连接您的MetaMask钱包。"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}
      
      {isConnected && networkName !== 'Magnet POW链' && (
        <Alert
          type="warning"
          message="网络不匹配"
          description="存款操作需要连接到Magnet POW链网络，请切换网络。"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}
      
      {bridgeStatus && bridgeStatus.paused && (
        <Alert
          type="error"
          message="跨链桥已暂停"
          description="跨链桥当前处于暂停状态，暂不能进行存款操作。请稍后再试。"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}
      
      <Card className="card-container">
        <Form layout="vertical">
          <Form.Item label="存款金额 (MAG)">
            <Input
              placeholder="请输入存款金额（最小10000 MAG）"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              suffix="MAG"
              disabled={loading || !isConnected || networkName !== 'Magnet POW链'}
            />
            {nativeBalance && (
              <div className="balance-info">当前余额: {nativeBalance} MAG</div>
            )}
          </Form.Item>
          
          <Form.Item label="接收地址 (BSC)">
            <Input value={address} disabled />
            <div className="hint">代币将发送到您当前连接的BSC钱包地址</div>
          </Form.Item>
          
          {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
            <div className="fee-info">
              <Statistic title="手续费" value={fee.toFixed(4)} suffix="MAG" />
              <Statistic title="实际到账" value={netAmount.toFixed(4)} suffix="MAG" />
              <Statistic title="预计完成时间" value="3-5分钟" />
            </div>
          )}
          
          <Divider />
          
          <div className="form-actions">
            <Space>
              <Button
                type="primary"
                onClick={handleDeposit}
                loading={loading}
                disabled={
                  !isConnected || 
                  networkName !== 'Magnet POW链' || 
                  !amount || 
                  isNaN(parseFloat(amount)) || 
                  parseFloat(amount) <= 0 ||
                  (bridgeStatus && bridgeStatus.paused)
                }
              >
                确认存款
              </Button>
              {networkName !== 'Magnet POW链' && isConnected && (
                <Button onClick={() => switchChain({ chainId: 114514 })}>
                  切换到Magnet POW链
                </Button>
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
                  <Text>
                    {txStatus.status === 'pending' && '等待中'}
                    {txStatus.status === 'confirming' && '确认中'}
                    {txStatus.status === 'completed' && '已完成'}
                    {txStatus.status === 'failed' && '失败'}
                  </Text>
                </div>
                
                {txStatus.confirmations > 0 && (
                  <div className="tx-info-item">
                    <Text strong>确认数: </Text>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                      <div style={{ width: '100%', maxWidth: 400 }}>
                        <Progress 
                          percent={Math.min(100, Math.round(txStatus.confirmations / txStatus.requiredConfirmations * 100))}
                          format={() => `${txStatus.confirmations}/${txStatus.requiredConfirmations}`}
                          status={txStatus.status === 'failed' ? 'exception' : undefined}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            
            <div className="tx-help-text">
              <Text type="secondary">
                存款过程需要等待区块确认，大约需要3-5分钟。确认完成后，MAG代币将自动铸造到您的BSC钱包地址。
              </Text>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DepositPage;
