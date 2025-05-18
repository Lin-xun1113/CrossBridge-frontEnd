import React, { useState, useEffect } from 'react';
import { Card, Tabs, Form, Input, Button, Table, Typography, Switch, Spin, message, InputNumber, Space, Modal, Tag } from 'antd';
import { useAdmin } from '../contexts/AdminContext';
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { readContract, waitForTransaction, getPublicClient } from '@wagmi/core';
import { config } from '../config';
import { formatUnits, parseUnits, parseEther } from 'viem';
import { formatEther } from 'viem';
import { useBridge } from '../contexts/BridgeContext';
import { BSC_CONTRACTS, MAGNET_CONTRACTS } from '../config/contracts';

const { Title, Text } = Typography;
// Tabs不再使用TabPane子组件，改用items配置

const BridgeAdmin = () => {
  const { isBridgeOwner, isBridgeValidator, loading: adminLoading } = useAdmin();
  const { address, isConnected } = useAccount();
  const chainId = useChainId(); // 获取当前链ID
  const publicClient = usePublicClient(); // 使用 publicClient 钩子获取客户端实例
  const { data: walletClient } = useWalletClient(); // 获取钱包客户端实例，用于发送交易
  // 使用BridgeContext提供的桥接状态数据
  const { bridgeStatus, loadingStatus: bridgeStatusLoading } = useBridge();
  
  // 调试: 输出bridgeStatus
  console.log('当前BridgeAdmin bridgeStatus:', bridgeStatus);
  
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);
  
  // 从BridgeContext获取的数据会保存在这里，以便UI使用
  const [bridgeInfo, setBridgeInfo] = useState({
    minConfirmations: 0,
    maxTransactionAmount: '0',
    minTransactionAmount: '0',
    dailyTransactionLimit: '0',
    dailyTransactionTotal: '0',
    feePercentage: 0,
    feeCollector: '',
    collectedFees: '0',
    paused: false
  });
  
  // 专门用于格式化显示的辅助函数，类似Home页面的做法
  const formatDisplayAmount = (amount) => {
    if (!amount) return '0 MAG';
    if (parseFloat(amount) > 100000000000) return '无限额';
    return parseFloat(amount).toLocaleString() + ' MAG';
  };
  
  const [validators, setValidators] = useState([]);
  const [owner, setOwner] = useState('');
  const [validatorForm] = Form.useForm();
  const [limitForm] = Form.useForm();
  const [feeForm] = Form.useForm();

  // 加载跨链桥信息 - 使用publicClient直接调用合约
  const loadBridgeInfo = async () => {
    // 增加安全检查，确保钱包连接和链正确
    if (!isConnected || !chainId) {
      console.log('钱包未连接或chainId不存在');
      return;
    }
    
    // 检查是否在BSC测试网上
    if (chainId !== 97) { // BSC测试网ID
      console.log('请切换到BSC测试网，当前链 ID:', chainId);
      return;
    }
    
    // 检查 publicClient 是否存在
    if (!publicClient) {
      console.log('publicClient 对象不存在');
      return;
    }

    try {
      setLoading(true);
      console.log('开始独立加载桥接信息...');
      
      // 确保我们使用的合约地址正确
      const bridgeAddress = BSC_CONTRACTS.BRIDGE_ADDRESS;
      
      // 查看bridgeStatus是否存在
      if (bridgeStatus) {
        console.log('BridgeContext中已加载的bridgeStatus数据:', bridgeStatus);
      } else {
        console.log('BridgeContext中的bridgeStatus未加载，将独立获取全部数据');
      }
      
      console.log('合约地址检查:', {
        'BSC_CONTRACTS.BRIDGE_ADDRESS': bridgeAddress,
        'config.bscBridgeAddress': config.bscBridgeAddress,
        '是否一致': bridgeAddress === config.bscBridgeAddress
      });
      
      // 准备要获取的所有数据项
      let paused = false;
      let feePercentage = 0;
      let minAmount = '0';
      let maxAmount = '0';
      let dailyLimit = '0';
      let minConfirmations = 0;
      let feeCollector = '';
      let collectedFees = 0n;
      let dailyTransactionTotal = 0n;

      try {
        // 如果bridgeStatus存在，使用其中的数据
        if (bridgeStatus) {
          console.log('使用BridgeContext中的基本数据...');
          paused = bridgeStatus.paused;
          feePercentage = bridgeStatus.feePercentage;
          minAmount = bridgeStatus.minAmount;
          maxAmount = bridgeStatus.maxAmount;
          dailyLimit = bridgeStatus.dailyLimit;
        } else {
          // 如果bridgeStatus不存在，独立获取这些数据
          console.log('独立获取所有桥接基本数据...');
          
          // 使用 publicClient 调用合约
          const basicInfo = await Promise.all([
            publicClient.readContract({
              address: bridgeAddress,
              abi: config.magBridgeABI,
              functionName: 'paused'
            }),
            publicClient.readContract({
              address: bridgeAddress,
              abi: config.magBridgeABI,
              functionName: 'feePercentage'
            }),
            publicClient.readContract({
              address: bridgeAddress,
              abi: config.magBridgeABI,
              functionName: 'minTransactionAmount'
            }),
            publicClient.readContract({
              address: bridgeAddress,
              abi: config.magBridgeABI,
              functionName: 'maxTransactionAmount'
            }),
            publicClient.readContract({
              address: bridgeAddress,
              abi: config.magBridgeABI,
              functionName: 'dailyTransactionLimit'
            })
          ]);
          
          // 处理获取的数据
          paused = basicInfo[0];
          feePercentage = Number(basicInfo[1]) / 10000; // 转换为比例
          minAmount = formatEther(basicInfo[2]);
          maxAmount = formatEther(basicInfo[3]);
          dailyLimit = formatEther(basicInfo[4]);
        }

        // 无论bridgeStatus是否存在，都需要获取额外数据
        const additionalInfo = await Promise.all([
          publicClient.readContract({
            address: bridgeAddress,
            abi: config.magBridgeABI, 
            functionName: 'minConfirmations'
          }),
          publicClient.readContract({
            address: bridgeAddress,
            abi: config.magBridgeABI,
            functionName: 'feeCollector'
          }),
          publicClient.readContract({
            address: bridgeAddress,
            abi: config.magBridgeABI,
            functionName: 'collectedFees'
          }),
          publicClient.readContract({
            address: bridgeAddress,
            abi: config.magBridgeABI,
            functionName: 'dailyTransactionTotal'
          })
        ]);
        
        // 处理额外数据
        minConfirmations = additionalInfo[0];
        feeCollector = additionalInfo[1];
        collectedFees = additionalInfo[2];
        dailyTransactionTotal = additionalInfo[3];

      } catch (dataError) {
        // 改进错误处理和日志输出
        console.error('获取桥接数据出错:', {
          message: dataError.message,
          name: dataError.name,
          stack: dataError.stack,
          // 将错误对象转为字符串输出
          error: JSON.stringify(dataError, Object.getOwnPropertyNames(dataError))
        });
        message.error('获取桥接数据失败: ' + (dataError.message || '未知错误'));
        setLoading(false);
        return;
      }
      
      console.log('链上获取的数据:', {
        paused,
        feePercentage,
        minAmount,
        maxAmount,
        dailyLimit,
        minConfirmations,
        feeCollector,
        collectedFees,
        dailyTransactionTotal
      });

      // 使用 formatEther 处理 BigInt 数据
      const formattedCollectedFees = formatEther(collectedFees);
      const formattedDailyTotal = formatEther(dailyTransactionTotal);
      
      // 创建bridgeInfo数据对象
      const bridgeInfoData = {
        minConfirmations: Number(minConfirmations),
        maxTransactionAmount: parseFloat(maxAmount) > 100000000000 ? '无限额' : maxAmount,
        minTransactionAmount: minAmount,
        dailyTransactionLimit: parseFloat(dailyLimit) > 100000000000 ? '无限额' : dailyLimit,
        dailyTransactionTotal: formattedDailyTotal,
        feePercentage: feePercentage * 100, // 转换为百分比形式
        feeCollector: feeCollector,
        collectedFees: formattedCollectedFees,
        paused: paused
      };
      
      console.log('最终处理的bridgeInfo数据:', bridgeInfoData);
      
      // 更新状态
      setBridgeInfo(bridgeInfoData);
      
      // 设置表单初始值
      limitForm.setFieldsValue({
        maxTransactionAmount: parseFloat(bridgeStatus.maxAmount) > 100000000000 ? '' : bridgeStatus.maxAmount,
        minTransactionAmount: bridgeStatus.minAmount,
        dailyTransactionLimit: parseFloat(bridgeStatus.dailyLimit) > 100000000000 ? '' : bridgeStatus.dailyLimit,
        minConfirmations: Number(minConfirmations)
      });
      
      feeForm.setFieldsValue({
        feePercentage: bridgeStatus.feePercentage * 100,
        feeCollector: feeCollector
      });
      
      console.log('表单初始值设置完成');
    } catch (error) {
      console.error('加载跨链桥信息失败:', error);
      message.error('加载跨链桥信息失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载合约所有者
  const loadValidators = async () => {
    if (!isConnected || chainId !== 97) {
      return;
    }

    try {
      setLoading(true);
      console.log('开始从链上加载合约所有者...');
      
      // 获取合约所有者
      const contractOwner = await publicClient.readContract({
        address: config.bscBridgeAddress,
        abi: config.magBridgeABI,
        functionName: 'owner'
      });
      
      console.log('合约所有者:', contractOwner);
      setOwner(contractOwner);
      
      // 不再获取验证者列表，因为合约中没有直接提供获取所有验证者的方法
      
      // 只检查当前用户是否为验证者
      if (address) {
        try {
          const isCurrentUserValidator = await publicClient.readContract({
            address: config.bscBridgeAddress,
            abi: config.magBridgeABI,
            functionName: 'validators',
            args: [address]
          });
          
          if (isCurrentUserValidator) {
            // 只添加当前用户
            setValidators([{
              address,
              active: true,
              isCurrentUser: true
            }]);
          } else {
            setValidators([]);
          }
        } catch (error) {
          console.error(`检查当前用户是否为验证者时出错:`, error);
          setValidators([]);
        }
      } else {
        setValidators([]);
      }
      
    } catch (error) {
      // 改进错误处理和日志输出
      console.error('加载验证者列表失败:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        // 将错误对象转为字符串输出
        error: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
      message.error('加载验证者列表失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 添加验证者
  const addValidator = async (values) => {
    if (!isConnected || chainId !== 97 || !isBridgeOwner) {
      message.error('没有权限执行此操作');
      return;
    }
    
    // 检查钱包客户端是否可用
    if (!walletClient) {
      message.error('无法连接钱包客户端');
      return;
    }

    try {
      setLoading(true);
      
      const { validatorAddress } = values;
      
      console.log('添加验证者:', {
        address: config.bscBridgeAddress,
        functionName: 'addValidator',
        validatorAddress
      });
      
      // 使用walletClient.writeContract替代writeContract
      const hash = await walletClient.writeContract({
        address: config.bscBridgeAddress,
        abi: config.magBridgeABI,
        functionName: 'addValidator',
        args: [validatorAddress]
      });
      
      message.success('交易已提交，等待确认...');
      
      // 等待交易确认
      const receipt = await waitForTransaction({ 
        hash,
        chainId: chainId // 明确指定chainId
      });
      
      if (receipt.status === 'success') {
        message.success('验证者添加成功');
        validatorForm.resetFields();
        loadBridgeInfo(); // 重新加载桥接信息
      } else {
        message.error('验证者添加失败');
      }
      
    } catch (error) {
      console.error('添加验证者失败:', error);
      message.error('添加验证者失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 移除验证者
  const removeValidator = async (validatorAddress) => {
    if (!isConnected || chainId !== 97 || !isBridgeOwner) {
      message.error('没有权限执行此操作');
      return;
    }
    
    // 检查钱包客户端是否可用
    if (!walletClient) {
      message.error('无法连接钱包客户端');
      return;
    }

    try {
      setLoading(true);
      
      console.log('移除验证者:', {
        address: config.bscBridgeAddress,
        functionName: 'removeValidator',
        validatorAddress
      });
      
      // 使用walletClient.writeContract替代writeContract
      const hash = await walletClient.writeContract({
        address: config.bscBridgeAddress,
        abi: config.magBridgeABI,
        functionName: 'removeValidator',
        args: [validatorAddress]
      });
      
      message.success('交易已提交，等待确认...');
      
      // 等待交易确认
      const receipt = await waitForTransaction({ 
        hash,
        chainId: chainId // 明确指定chainId
      });
      
      if (receipt.status === 'success') {
        message.success('验证者移除成功');
        loadBridgeInfo(); // 重新加载桥接信息
      } else {
        message.error('验证者移除失败');
      }
      
    } catch (error) {
      console.error('移除验证者失败:', error);
      message.error('移除验证者失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 更新交易限制
  const updateTransactionLimits = async (values) => {
    if (!isConnected || chainId !== 97 || !isBridgeOwner) {
      message.error('没有权限执行此操作');
      return;
    }
    
    // 检查钱包客户端是否可用
    if (!walletClient) {
      message.error('无法连接钱包客户端');
      return;
    }

    try {
      setLoading(true);
      
      const { maxTransactionAmount, minTransactionAmount, dailyTransactionLimit, minConfirmations } = values;
      
      console.log('更新交易限制:', {
        maxTransactionAmount,
        minTransactionAmount,
        dailyTransactionLimit,
        minConfirmations
      });
      
      // 使用Modal提示用户将进行多个交易
      Modal.confirm({
        title: '更新交易限制',
        content: '将依次设置最大交易金额、最小交易金额、每日限额和最小确认数，需要依次确认四笔交易。',
        onOk: async () => {
          try {
            // 1. 设置最大交易金额
            message.info('正在设置最大交易金额...');
            const maxTxHash = await walletClient.writeContract({
              address: config.bscBridgeAddress,
              abi: config.magBridgeABI,
              functionName: 'setMaxTransactionAmount',
              args: [parseUnits(maxTransactionAmount.toString(), 18)]
            });
            
            // 等待第一笔交易确认
            await waitForTransaction({ 
              hash: maxTxHash,
              chainId: chainId
            });
            message.success('最大交易金额设置成功');
            
            // 2. 设置最小交易金额
            message.info('正在设置最小交易金额...');
            const minTxHash = await walletClient.writeContract({
              address: config.bscBridgeAddress,
              abi: config.magBridgeABI,
              functionName: 'setMinTransactionAmount',
              args: [parseUnits(minTransactionAmount.toString(), 18)]
            });
            
            // 等待第二笔交易确认
            await waitForTransaction({ 
              hash: minTxHash,
              chainId: chainId
            });
            message.success('最小交易金额设置成功');
            
            // 3. 设置每日交易限额
            message.info('正在设置每日交易限额...');
            const dailyLimitHash = await walletClient.writeContract({
              address: config.bscBridgeAddress,
              abi: config.magBridgeABI,
              functionName: 'setDailyTransactionLimit',
              args: [parseUnits(dailyTransactionLimit.toString(), 18)]
            });
            
            // 等待第三笔交易确认
            await waitForTransaction({ 
              hash: dailyLimitHash,
              chainId: chainId
            });
            message.success('每日交易限额设置成功');
            
            // 4. 设置最小确认数
            message.info('正在设置最小确认数...');
            const minConfHash = await walletClient.writeContract({
              address: config.bscBridgeAddress,
              abi: config.magBridgeABI,
              functionName: 'setMinConfirmations',
              args: [minConfirmations]
            });
            
            // 等待第四笔交易确认
            await waitForTransaction({ 
              hash: minConfHash,
              chainId: chainId
            });
            
            message.success('所有交易限制设置已完成');
            loadBridgeInfo(); // 重新加载桥接信息
          } catch (modalError) {
            console.error('设置交易限制失败:', modalError);
            message.error('设置交易限制失败: ' + modalError.message);
          } finally {
            setLoading(false);
          }
        }
      });
    } catch (error) {
      console.error('更新交易限制失败:', error);
      message.error('更新交易限制失败: ' + error.message);
      setLoading(false);
    }
  };

  // 更新费用设置
  const updateFeeSettings = async (values) => {
    if (!isConnected || chainId !== 97 || !isBridgeOwner) {
      message.error('没有权限执行此操作');
      return;
    }
    
    // 检查钱包客户端是否可用
    if (!walletClient) {
      message.error('无法连接钱包客户端');
      return;
    }

    try {
      setLoading(true);
      
      const { feePercentage, feeCollector } = values;
      
      console.log('更新费用设置:', {
        feePercentage,
        feeCollector
      });
      
      // 使用Modal提示用户将进行多个交易
      Modal.confirm({
        title: '更新费用设置',
        content: '将依次设置费用百分比和费用接收地址，需要依次确认两笔交易。',
        onOk: async () => {
          try {
            // 1. 设置费用百分比
            message.info('正在设置费用百分比...');
            const feePercentageHash = await walletClient.writeContract({
              address: config.bscBridgeAddress,
              abi: config.magBridgeABI,
              functionName: 'setFeePercentage',
              args: [Math.floor(feePercentage * 100)] // 转换为合约格式
            });
            
            // 等待第一笔交易确认
            await waitForTransaction({ 
              hash: feePercentageHash,
              chainId: chainId
            });
            message.success('费用百分比设置成功');
            
            // 2. 设置费用接收地址
            message.info('正在设置费用接收地址...');
            const feeCollectorHash = await walletClient.writeContract({
              address: config.bscBridgeAddress,
              abi: config.magBridgeABI,
              functionName: 'setFeeCollector',
              args: [feeCollector]
            });
            
            // 等待第二笔交易确认
            await waitForTransaction({ 
              hash: feeCollectorHash,
              chainId: chainId
            });
            message.success('费用接收地址设置成功');
            
            message.success('所有费用设置更新已完成');
            loadBridgeInfo(); // 重新加载桥接信息
          } catch (modalError) {
            console.error('设置费用失败:', modalError);
            message.error('设置费用失败: ' + modalError.message);
          } finally {
            setLoading(false);
          }
        }
      });
      
    } catch (error) {
      console.error('更新费用设置失败:', error);
      message.error('更新费用设置失败: ' + error.message);
      setLoading(false);
    }
  };

  // 提取费用
  const withdrawFees = async () => {
    if (!isConnected || chainId !== 97 || !isBridgeOwner) {
      message.error('没有权限执行此操作');
      return;
    }
    
    // 检查钱包客户端是否可用
    if (!walletClient) {
      message.error('无法连接钱包客户端');
      return;
    }
    
    try {
      // 确认提取费用
      Modal.confirm({
        title: '提取费用',
        content: `确定要提取 ${bridgeInfo.collectedFees} MAG 的累积费用吗？`,
        onOk: async () => {
          try {
            setLoading(true);
            
            console.log('执行提取费用:', {
              address: config.bscBridgeAddress,
              functionName: 'withdrawFees',
              recipient: address
            });
            
            // 使用walletClient.writeContract替代writeContract
            const hash = await walletClient.writeContract({
              address: config.bscBridgeAddress,
              abi: config.magBridgeABI,
              functionName: 'withdrawFees',
              args: [address] // 提取到当前连接的地址
            });
            
            message.success('交易已提交，等待确认...');
            
            // 等待交易确认
            const receipt = await waitForTransaction({ 
              hash,
              chainId: chainId // 直接使用当前变量而不是存储的副本
            });
            
            if (receipt.status === 'success') {
              message.success('费用提取成功');
              loadBridgeInfo(); // 重新加载桥接信息
            } else {
              message.error('费用提取失败');
            }
          } catch (modalError) {
            console.error('Modal中执行提取费用失败:', modalError);
            message.error('提取费用失败: ' + modalError.message);
          } finally {
            setLoading(false);
          }
        }
      });
      
    } catch (error) {
      console.error('提取费用失败:', error);
      message.error('提取费用失败: ' + error.message);
      setLoading(false);
    }
  };

  // 暂停/恢复合约
  const togglePause = async () => {
    if (!isConnected || chainId !== 97 || !isBridgeOwner) {
      message.error('没有权限执行此操作');
      return;
    }
    
    // 检查钱包客户端是否可用
    if (!walletClient) {
      message.error('无法连接钱包客户端');
      return;
    }

    try {
      setLoading(true);
      
      const functionName = bridgeInfo.paused ? 'unpause' : 'pause';
      
      console.log('执行暂停/恢复操作:', {
        address: config.bscBridgeAddress,
        functionName
      });
      
      // 使用walletClient.writeContract替代writeContract
      const hash = await walletClient.writeContract({
        address: config.bscBridgeAddress,
        abi: config.magBridgeABI,
        functionName
        // 不需要args参数，因为暂停/恢复函数不接受参数
      });
      
      message.success('交易已提交，等待确认...');
      
      // 等待交易确认
      const receipt = await waitForTransaction({ 
        hash,
        chainId: chainId // 直接使用当前变量
      });
      
      if (receipt.status === 'success') {
        message.success(bridgeInfo.paused ? '合约已恢复' : '合约已暂停');
        loadBridgeInfo(); // 重新加载桥接信息
      } else {
        message.error(bridgeInfo.paused ? '恢复合约失败' : '暂停合约失败');
      }
      
    } catch (error) {
      console.error('操作失败:', error);
      message.error('操作失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 简化的操作列定义
  const validatorColumns = [
    {
      title: '验证者地址',
      dataIndex: 'address',
      key: 'address',
      render: (text) => <Text copyable>{text}</Text>,
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        if (record.isCurrentUser) {
          return <Tag color="green">当前用户</Tag>;
        } else {
          return <Tag color="blue">验证者</Tag>;
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {isBridgeOwner && !record.isCurrentUser && (
            <Button 
              type="primary" 
              danger 
              onClick={() => removeValidator(record.address)}
            >
              移除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 当组件挂载或连接状态变化时执行初始加载
  useEffect(() => {
    console.log('桥接状态加载条件检查:', {
      isConnected,
      chainId,
      hasBridgeStatus: !!bridgeStatus,
      bridgeStatusLoading
    });
    
    // 只有当已连接到BSC测试网并且桥接状态已加载时才执行
    if (isConnected && chainId === 97) {
      // 无论bridgeStatus是否存在都尝试加载基本信息
      loadValidators();
      
      // 如果bridgeStatus存在，加载额外信息
      if (bridgeStatus) {
        console.log('桥接状态已加载，执行loadBridgeInfo');
        loadBridgeInfo();
      } else {
        console.log('桥接状态未加载，无法执行loadBridgeInfo');
        // 如果不是加载中状态但bridgeStatus为空，可能是获取失败
        if (!bridgeStatusLoading) {
          message.warning('桥接状态数据获取失败，请检查网络连接');
        }
      }
    }
  }, [isConnected, chainId, address, bridgeStatus, bridgeStatusLoading]);

  // 如果不是管理员，显示无权限提示
  if (!adminLoading && !isBridgeOwner && !isBridgeValidator) {
    return (
      <Card>
        <Title level={3}>跨链桥管理</Title>
        <Text type="danger">您没有权限访问此页面。只有跨链桥的所有者或验证者才能访问。</Text>
      </Card>
    );
  }

  return (
    <Spin spinning={loading || adminLoading}>
      <Card>
        <Title level={3}>跨链桥管理</Title>
        
        {/* 合约状态信息 */}
        <div style={{ marginBottom: 20 }}>
          <Title level={4}>合约状态</Title>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Text>当前状态: <Text strong type={bridgeInfo.paused ? 'danger' : 'success'}>{bridgeInfo.paused ? '已暂停' : '运行中'}</Text></Text>
            {isBridgeOwner && (
              <Button 
                type={bridgeInfo.paused ? 'primary' : 'danger'}
                onClick={togglePause}
              >
                {bridgeInfo.paused ? '恢复合约' : '暂停合约'}
              </Button>
            )}
          </div>
        </div>
        
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: '1',
              label: '验证者管理',
              children: (
                <>
                  <Card title="当前验证者" extra={owner && <Text type="secondary">桥接所有者: {owner.slice(0, 6)}...{owner.slice(-4)}</Text>}>
                    <Table
                      columns={validatorColumns}
                      dataSource={validators}
                      rowKey="address"
                      pagination={false}
                      loading={loading}
                    />
                  </Card>
                  
                  {isBridgeOwner && (
                    <Card title="添加验证者" style={{ marginTop: 20 }}>
                      <Form
                        form={validatorForm}
                        onFinish={addValidator}
                        layout="inline"
                      >
                        <Form.Item
                          name="validatorAddress"
                          label="验证者地址"
                          rules={[{ required: true, message: '请输入验证者地址' }]}
                        >
                          <Input placeholder="0x..." style={{ width: 320 }} />
                        </Form.Item>
                        <Form.Item>
                          <Button type="primary" htmlType="submit" loading={loading}>
                            添加
                          </Button>
                        </Form.Item>
                      </Form>
                    </Card>
                  )}
                </>
              )
            },
            isBridgeOwner ? {
              key: '2',
              label: '交易限制',
              children: (
                <Card title="设置跨链交易限额">
                  <Form
                    form={limitForm}
                    onFinish={updateTransactionLimits}
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                  >
                    <Form.Item
                      name="minConfirmations"
                      label="最小验证者确认数"
                      tooltip="处理跨链转账需要的最小验证者数量"
                      rules={[{ required: true, message: '请输入最小确认数' }]}
                    >
                      <InputNumber min={1} />
                    </Form.Item>
                    
                    <Form.Item
                      name="maxTransactionAmount"
                      label="单笔交易最大限额"
                      tooltip="设置为0表示不限额"
                    >
                      <InputNumber 
                        min={0} 
                        style={{ width: 200 }} 
                        addonAfter="MAG"
                      />
                    </Form.Item>
                    
                    <Form.Item
                      name="minTransactionAmount"
                      label="单笔交易最小限额"
                      rules={[{ required: true, message: '请输入最小限额' }]}
                    >
                      <InputNumber 
                        min={0} 
                        style={{ width: 200 }} 
                        addonAfter="MAG"
                      />
                    </Form.Item>
                    
                    <Form.Item
                      name="dailyTransactionLimit"
                      label="每日交易总限额"
                      tooltip="设置为0表示不限额"
                    >
                      <InputNumber 
                        min={0} 
                        style={{ width: 200 }} 
                        addonAfter="MAG"
                      />
                    </Form.Item>
                    
                    <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
                      <Button type="primary" htmlType="submit" loading={loading}>
                        更新限额设置
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              )
            } : null,
            isBridgeOwner ? {
              key: '3',
              label: '费用管理',
              children: (
                <>
                  <Card title="设置手续费">
                    <Form
                      form={feeForm}
                      onFinish={updateFeeSettings}
                      labelCol={{ span: 8 }}
                      wrapperCol={{ span: 16 }}
                    >
                      <Form.Item
                        name="feePercentage"
                        label="手续费比例"
                        tooltip="输入整数，如 0.5% 则输入 0.5"
                        rules={[{ required: true, message: '请输入手续费比例' }]}
                      >
                        <InputNumber 
                          min={0} 
                          max={100} 
                          step={0.1} 
                          style={{ width: 200 }}
                          addonAfter="%"
                        />
                      </Form.Item>
                      
                      <Form.Item
                        name="feeCollector"
                        label="手续费接收地址"
                        rules={[{ required: true, message: '请输入手续费接收地址' }]}
                      >
                        <Input placeholder="0x..." style={{ width: 320 }} />
                      </Form.Item>
                      
                      <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
                        <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 16 }}>
                          更新费用设置
                        </Button>
                        <Button onClick={withdrawFees} loading={loading}>
                          提取手续费 ({bridgeInfo.collectedFees} MAG)
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                  
                  <Card title="合约暂停" style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <Switch 
                        checked={bridgeInfo.paused} 
                        onChange={togglePause}
                        loading={loading}
                      />
                      <Text style={{ marginLeft: 16 }}>
                        {bridgeInfo.paused ? 
                          <Tag color="red">已暂停</Tag> : 
                          <Tag color="green">运行中</Tag>
                        }
                      </Text>
                    </div>
                  </Card>
                </>
              )
            } : null
          ].filter(Boolean)}
        />
      </Card>
    </Spin>
  );
};
export default BridgeAdmin;
