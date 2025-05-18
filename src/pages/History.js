import React, { useState, useEffect } from 'react';
import { Typography, Table, Tag, Tooltip, Button, Card, Select, Space, Form, message } from 'antd';
import { ReloadOutlined, LinkOutlined, SyncOutlined, CopyOutlined } from '@ant-design/icons';
import { useAccount } from 'wagmi';
import { useBridge } from '../contexts/BridgeContext';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const HistoryPage = () => {
  const { isConnected, address } = useAccount();
  const { manualPollTransaction } = useBridge();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [updatingTx, setUpdatingTx] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
  });

  // 从localStorage和最近交易中获取交易历史数据
  useEffect(() => {
    if (isConnected && address) {
      fetchTransactions();
    } else {
      setTransactions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  // 从localStorage加载交易数据
  const fetchTransactions = async () => {
    setLoading(true);
    
    try {
      // 确保address存在
      if (!address) {
        console.log('钱包未连接或地址不可用');
        setTransactions([]);
        return;
      }
      
      // 从localStorage获取交易历史记录
      const localStorageKey = `mag-bridge-transactions-${address.toLowerCase()}`;
      const storedData = localStorage.getItem(localStorageKey);
      let storedTransactions = storedData ? JSON.parse(storedData) : [];
      
      // // 添加测试数据如果没有交易记录
      // if (storedTransactions.length === 0) {
      //   // 创建一些测试交易供演示
      //   const now = new Date();
      //   storedTransactions = [
      //     {
      //       id: `deposit-${Date.now()}`,
      //       txHash: '0x' + Math.random().toString(16).substring(2, 66),
      //       type: 'deposit',
      //       fromChain: 'magnet',
      //       toChain: 'bsc',
      //       fromAddress: address,
      //       toAddress: address,
      //       amount: '50000',
      //       fee: '250',
      //       status: 'confirming',
      //       confirmations: 6,
      //       requiredConfirmations: 12,
      //       timestamp: new Date(now.getTime() - 1000*60*30).toISOString() // 30分钟前
      //     },
      //     {
      //       id: `withdraw-${Date.now()+1}`,
      //       txHash: '0x' + Math.random().toString(16).substring(2, 66),
      //       type: 'withdraw',
      //       fromChain: 'bsc',
      //       toChain: 'magnet',
      //       fromAddress: address,
      //       toAddress: '0x' + Math.random().toString(16).substring(2, 42),
      //       amount: '25000',
      //       fee: '125',
      //       status: 'verifying',
      //       confirmations: 1,
      //       requiredConfirmations: 2,
      //       timestamp: new Date(now.getTime() - 1000*60*10).toISOString() // 10分钟前
      //     }
      //   ];
        
      //   // 将测试数据存入localStorage
      //   localStorage.setItem(localStorageKey, JSON.stringify(storedTransactions));
      // }
      
      // 按时间戳排序（新交易在前）
      storedTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // 更新UI
      setTransactions(storedTransactions);
      
      console.log('从本地存储加载了', storedTransactions.length, '条交易记录');
    } catch (error) {
      console.error('加载交易历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理筛选变更
  const handleFilterChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value
    });
  };
  
  // 更新交易状态
  const handleUpdateStatus = async (txHash, type) => {
    if (!manualPollTransaction || !txHash) return;
    
    setUpdatingTx(txHash);
    try {
      await manualPollTransaction(txHash, type);
      // 交易状态更新后重新加载交易列表
      fetchTransactions();
    } catch (error) {
      console.error('更新交易状态失败:', error);
    } finally {
      setUpdatingTx('');
    }
  };

  // 应用筛选器
  const filteredTransactions = transactions.filter(tx => {
    if (filters.type !== 'all' && tx.type !== filters.type) {
      return false;
    }
    if (filters.status !== 'all' && tx.status !== filters.status) {
      return false;
    }
    return true;
  });

  // 状态标签渲染
  const renderStatus = (status) => {
    const statusMap = {
      'pending': { color: 'orange', text: '等待中' },
      'confirming': { color: 'processing', text: '确认中' },
      'verifying': { color: 'processing', text: '验证中' },
      'executing': { color: 'processing', text: '执行中' },
      'completed': { color: 'success', text: '已完成' },
      'failed': { color: 'error', text: '失败' }
    };
    
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  // 设置响应式列配置
  const getResponsiveColumns = () => {
    // 获取当前屏幕宽度
    const isMobile = window.innerWidth <= 576;
    
    // 基础列始终显示
    const baseColumns = [
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        fixed: 'left',
        width: isMobile ? 60 : 80,
        render: type => (
          <Tag color={type === 'deposit' ? 'blue' : 'green'} style={{ margin: 0 }}>
            {type === 'deposit' ? '存' : '提'}
          </Tag>
        ),
      },
      {
        title: '金额',
        dataIndex: 'amount',
        key: 'amount',
        width: isMobile ? 80 : 120,
        render: (amount, record) => (
          <Space direction="vertical" size={0} style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Text style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {parseFloat(amount).toLocaleString()} MAG
            </Text>
            {!isMobile && (
              <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                手续费: {parseFloat(record.fee).toLocaleString()} MAG
              </Text>
            )}
          </Space>
        ),
        sorter: (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: isMobile ? 60 : 100,
        render: renderStatus,
        filters: [
          { text: '等待中', value: 'pending' },
          { text: '确认中', value: 'confirming' },
          { text: '验证中', value: 'verifying' },
          { text: '执行中', value: 'executing' },
          { text: '已完成', value: 'completed' },
          { text: '失败', value: 'failed' },
        ],
        onFilter: (value, record) => record.status === value,
      },
    ];
    
    // 中等屏幕显示的额外列
    const mediumScreenColumns = [
      {
        title: '源链→目标链',
        dataIndex: 'fromChain',
        key: 'chains',
        width: 140,
        responsive: ['md'],
        render: (fromChain, record) => (
          <Space>
            <Tag>{fromChain === 'magnet' ? 'Magnet' : 'BSC'}</Tag>
            <span>→</span>
            <Tag>{record.toChain === 'magnet' ? 'Magnet' : 'BSC'}</Tag>
          </Space>
        ),
      },
      {
        title: '时间',
        dataIndex: 'timestamp',
        key: 'timestamp',
        width: 150,
        responsive: ['md'],
        render: timestamp => new Date(timestamp).toLocaleString('zh-CN'),
        sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
        defaultSortOrder: 'descend',
      }
    ];

    // 交易哈希列 - 根据屏幕尺寸自动调整显示
    const txHashColumn = {
      title: '交易哈希',
      dataIndex: 'txHash',
      key: 'txHash',
      ellipsis: true,
      width: isMobile ? 100 : 180,
      render: txHash => {
        // 根据屏幕尺寸调整哈希显示长度
        const startChars = isMobile ? 6 : 10;
        const endChars = isMobile ? 4 : 8;
        const displayHash = `${txHash.substring(0, startChars)}...${txHash.substring(txHash.length - endChars)}`;
        
        return (
          <Tooltip title={"单击复制完整交易哈希: " + txHash}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Text 
                style={{ 
                  flexGrow: 1, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap',
                  marginRight: '4px',
                  fontSize: isMobile ? '12px' : '14px'
                }}
              >
                {displayHash}
              </Text>
              <Button 
                type="link" 
                size="small"
                style={{ padding: isMobile ? '0 2px' : '0 4px', minWidth: isMobile ? '24px' : '32px' }}
                icon={<CopyOutlined style={{ fontSize: isMobile ? '12px' : '14px' }} />} 
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(txHash)
                    .then(() => message.success('完整交易哈希已复制到剪贴板'))
                    .catch(err => message.error('复制失败: ' + err.message));
                }}
              />
            </div>
          </Tooltip>
        );
      },
    };

    // 操作列 - 固定在右侧
    const actionColumn = {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: isMobile ? 80 : 120,
      render: (_, record) => {
        // 在移动端使用更紧凑的布局
        if (isMobile) {
          return (
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                danger
                size="small" 
                style={{ padding: '0 8px', fontSize: '12px', height: '24px', width: '100%' }}
                icon={updatingTx === record.txHash ? <SyncOutlined spin /> : <ReloadOutlined />}
                onClick={() => handleUpdateStatus(record.txHash, record.type)}
                loading={updatingTx === record.txHash}
                disabled={updatingTx === record.txHash}
              >
                更新
              </Button>
            </Space>
          );
        }
        
        // 大屏幕使用完整布局
        return (
          <Space direction="vertical" size="small">
            <Space size="small">
              <Button type="link" size="small" icon={<LinkOutlined />} style={{ padding: '0px', marginRight: '4px' }}>
                详情
              </Button>
              {record.type === 'deposit' && record.status === 'confirming' && (
                <Tooltip title={`确认进度: ${record.confirmations}/${record.requiredConfirmations}`}>
                  <Button type="link" size="small" style={{ padding: '0px' }}>
                    {record.confirmations}/{record.requiredConfirmations}
                  </Button>
                </Tooltip>
              )}
            </Space>
            <Button 
              type="primary" 
              danger
              size="small" 
              icon={updatingTx === record.txHash ? <SyncOutlined spin /> : <ReloadOutlined />}
              onClick={() => handleUpdateStatus(record.txHash, record.type)}
              loading={updatingTx === record.txHash}
              disabled={updatingTx === record.txHash}
            >
              更新状态
            </Button>
          </Space>
        );
      },
    };
  
    return [...baseColumns, ...mediumScreenColumns, txHashColumn, actionColumn];
  };
  
  // 获取响应式列配置
  const columns = getResponsiveColumns();

  return (
    <div className="history-page">
      <Title level={2} className="page-title">交易历史</Title>
      
      <Paragraph>
        查看您的存款和提款交易历史记录。您可以按交易类型、状态和时间进行筛选。
      </Paragraph>
      
      <Card className="card-container">
        <div className="table-filters" style={{ marginBottom: 16 }}>
          <Form layout="inline" className="responsive-filter-form">
            <Form.Item label="交易类型" className="filter-form-item">
              <Select 
                value={filters.type}
                onChange={value => handleFilterChange('type', value)}
                style={{ width: '100%' }}
                popupMatchSelectWidth={false}
              >
                <Option value="all">全部</Option>
                <Option value="deposit">存款</Option>
                <Option value="withdraw">提款</Option>
              </Select>
            </Form.Item>
            <Form.Item label="交易状态" className="filter-form-item">
              <Select 
                value={filters.status}
                onChange={value => handleFilterChange('status', value)}
                style={{ width: '100%' }}
                popupMatchSelectWidth={false}
              >
                <Option value="all">全部状态</Option>
                <Option value="pending">等待中</Option>
                <Option value="confirming">确认中</Option>
                <Option value="verifying">验证中</Option>
                <Option value="executing">执行中</Option>
                <Option value="completed">已完成</Option>
                <Option value="failed">失败</Option>
              </Select>
            </Form.Item>
            <Form.Item className="filter-form-item filter-button-item">
              <Button 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={fetchTransactions}
                loading={loading}
              >
                刷新
              </Button>
            </Form.Item>
          </Form>
        </div>
        
        <Table 
          className="responsive-table"
          columns={columns}
          dataSource={filteredTransactions}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          size="small"
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: total => `共 ${total} 条交易记录`,
            responsive: true
          }}
          locale={{ 
            emptyText: isConnected ? '暂无交易记录' : '请先连接钱包查看交易记录'
          }}
        />
      </Card>
    </div>
  );
};

export default HistoryPage;
