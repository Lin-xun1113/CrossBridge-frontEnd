import React, { useState, useEffect, useRef } from 'react';
import { Card, Tabs, Form, Input, Button, Table, Typography, Spin, message, InputNumber, Space, Modal, Tag, Tooltip } from 'antd';
import './MultiSigAdmin.css';
import { useAdmin } from '../contexts/AdminContext';
import { useAccount, useChainId, usePublicClient, useBalance, useWalletClient } from 'wagmi';
import { readContract, writeContract, waitForTransaction, getPublicClient } from '@wagmi/core';
import { config } from '../config';
import { formatUnits, parseUnits, formatEther, parseEther } from 'viem';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// 自定义格式化函数，处理MAG单位显示
const formatAmount = (amount) => {
  if (!amount || isNaN(parseFloat(amount))) return '0 MAG';
  return parseFloat(amount).toLocaleString() + ' MAG';
};

const MultiSigAdmin = () => {
  // 从上下文获取管理员状态
  const { isMultiSigOwner, isMultiSigIniter, loading: adminLoading } = useAdmin();
  
  // 获取当前用户账户和网络信息
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient(); // 获取钱包客户端实例，用于发送交易
  
  // 组件状态管理
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);
  const [walletInfo, setWalletInfo] = useState({
    owners: [],
    requiredConfirmations: 0,
    balance: '0',
  });
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [transactionDetails, setTransactionDetails] = useState({});
  
  // 表单引用
  const [ownerForm] = Form.useForm();
  const [transactionForm] = Form.useForm();
  const [confirmationForm] = Form.useForm();
  const [requirementForm] = Form.useForm();

  // 获取钱包余额 - 指定MAG链ID
  const { data: walletBalance } = useBalance({
    address: config.magnetMultiSigAddress,
    chainId: config.magnetNetworkId, // 明确指定MAG链ID
    watch: true,
  });

  // 加载多签钱包信息 - 返回Promise使其可链式调用
  const loadWalletInfo = async () => {
    return new Promise(async (resolve, reject) => {
      // 增加安全检查，确保钱包连接和链正确
      if (!isConnected || !chainId) {
        console.log('钱包未连接或chainId不存在');
        return reject(new Error('钱包未连接或chainId不存在'));
      }
      
      // 检查是否在Magnet POW链上 (ID: 114514)
      if (chainId !== config.magnetNetworkId) {
        console.log(`请切换到Magnet POW链，当前链ID: ${chainId}，需要的链ID: ${config.magnetNetworkId}`);
        message.error(`多签钱包合约需要在Magnet POW链上访问 (ID: ${config.magnetNetworkId})，请切换网络`);
        return reject(new Error(`网络ID不匹配，当前: ${chainId}，需要Magnet POW链: ${config.magnetNetworkId}`));
      }
      // 检查publicClient是否存在
      if (!publicClient) {
        console.log('publicClient 对象不存在');
        return reject(new Error('publicClient 对象不存在'));
      }

      try {
        console.log('开始加载多签钱包信息...');
        
        // 确保我们使用的合约地址正确
        const multiSigAddress = config.magnetMultiSigAddress;
        console.log('多签钱包合约地址:', multiSigAddress);
        
        // 从链上获取真实数据
        console.log('从链上获取多签钱包数据');
        
        // 获取所需确认数
        let requiredConfirmations = 0;
        try {
          requiredConfirmations = await publicClient.readContract({
            address: multiSigAddress,
            abi: config.magnetMultiSigABI,
            functionName: 'requiredConfirmations'
          });
          console.log('所需确认数:', requiredConfirmations);
        } catch (confirmError) {
          console.error('获取所需确认数失败:', confirmError);
          message.error('获取所需确认数失败，请检查合约连接');
          // 即使确认数获取失败，仍然继续执行，而不中断整个过程
        }
        
        // 获取所有者列表
        let confirmedOwners = [];
        try {
          // 直接使用getOwners函数获取所有者列表
          const owners = await publicClient.readContract({
            address: multiSigAddress,
            abi: config.magnetMultiSigABI,
            functionName: 'getOwners'
          });
          
          console.log('获取到的所有者列表:', owners);
          confirmedOwners = owners;
        } catch (ownersError) {
          console.error('获取所有者列表失败:', ownersError);
          
          // 如果无法使用getOwners，则回退到面向已知地址验证的方法
          console.log('尝试使用备选方案获取所有者...');
          
          const knownOwners = [
            '0x01598CdD08c9737a84ead88BAaED1ed4c3330cD2',
            '0xDc1f6e4b840F8E807B03aAA5B940B8Db73Eafc70', 
            '0xaC1F64cE7c768B5F6C19A352Bf9Cf313A26528D4'
          ];
          
          // 验证每个地址是否是所有者
          const ownersPromises = knownOwners.map(async (potentialOwner) => {
            try {
              const isOwner = await publicClient.readContract({
                address: multiSigAddress,
                abi: config.magnetMultiSigABI,
                functionName: 'isOwner',
                args: [potentialOwner]
              });
              
              return isOwner ? potentialOwner : null;
            } catch (error) {
              console.error(`检查地址 ${potentialOwner} 是否为所有者失败:`, error);
              return null;
            }
          });
          
          const ownersResults = await Promise.all(ownersPromises);
          confirmedOwners = ownersResults.filter(Boolean);
        }
        
        console.log('确认的所有者:', confirmedOwners);
        
        // 更新钱包信息状态
        const walletInfoData = {
          owners: confirmedOwners,
          requiredConfirmations: Number(requiredConfirmations),
          balance: walletBalance ? formatAmount(walletBalance.formatted) : '0 MAG'
        };
        
        console.log('设置钱包信息:', walletInfoData);
        setWalletInfo(walletInfoData);
        
        // 设置表单初始值
        requirementForm.setFieldsValue({
          requiredConfirmations: Number(requiredConfirmations)
        });
        
        // 成功加载数据，解析Promise
        resolve(walletInfoData);
        
      } catch (error) {
        console.error('加载多签钱包信息失败:', error);
        message.error('加载多签钱包信息失败');
        reject(error);
      }
    });
  };

  // 加载待处理交易 - 返回Promise对象以支持链式调用
  const loadPendingTransactions = async () => {
    return new Promise(async (resolve, reject) => {
      // 增加安全检查，确保钱包连接和链正确
      if (!isConnected || !chainId) {
        console.log('钱包未连接或chainId不存在');
        return reject(new Error('钱包未连接或chainId不存在'));
      }
      
      // 检查是否在Magnet POW链上 (ID: 114514)
      if (chainId !== config.magnetNetworkId) {
        console.log(`请切换到Magnet POW链，当前链ID: ${chainId}，需要的链ID: ${config.magnetNetworkId}`);
        message.error(`多签钱包合约需要在Magnet POW链上访问 (ID: ${config.magnetNetworkId})，请切换网络`);
        return reject(new Error(`网络ID不匹配，当前: ${chainId}，需要Magnet POW链: ${config.magnetNetworkId}`));
      }
      
      // 检查publicClient是否存在
      if (!publicClient) {
        console.log('publicClient 对象不存在');
        return reject(new Error('publicClient 对象不存在'));
      }

      try {
        console.log('开始加载待处理交易...');
        
        // 确保我们使用的合约地址正确
        const multiSigAddress = config.magnetMultiSigAddress;
        console.log('多签钱包合约地址:', multiSigAddress);
        
        // 获取交易总数，如果无法调用getPendingTransactions，我们可以逐个检查全部交易
        let transactionCount = 0;
        try {
          transactionCount = await publicClient.readContract({
            address: multiSigAddress,
            abi: config.magnetMultiSigABI,
            functionName: 'transactionCount'
          });
          console.log('交易总数:', transactionCount);
        } catch (countError) {
          console.error('获取交易总数失败:', countError);
          // 如果transactionCount无法获取，假设有几笔交易可能存在
          transactionCount = 10; // 默认检查前10笔交易
        }
        
        // 记录待处理交易的ID列表
        let pendingTxIds = [];
        
        try {
          // 首先尝试直接获取待处理交易ID列表
          console.log('尝试通过getPendingTransactions获取待处理交易...');
          pendingTxIds = await publicClient.readContract({
            address: multiSigAddress,
            abi: config.magnetMultiSigABI,
            functionName: 'getPendingTransactions'
          });
          console.log('获取到的待处理交易IDs:', pendingTxIds);
        } catch (txListError) {
          console.error('直接获取待处理交易失败:', txListError);
          
          // 如果直接获取失败，则尝试逐个检查交易状态
          console.log('尝试逐个检查交易状态...');
          
          // 使用备选方案：逐个检查交易
          const checkPromises = [];
          for (let i = 0; i < transactionCount; i++) {
            checkPromises.push(
              (async () => {
                try {
                  const txDetail = await publicClient.readContract({
                    address: multiSigAddress,
                    abi: config.magnetMultiSigABI,
                    functionName: 'transactions',
                    args: [i]
                  });
                  
                  // 检查是否已执行
                  if (txDetail && txDetail.length >= 3 && !txDetail[2]) {
                    return i; // 返回未执行交易的ID
                  }
                  return null;
                } catch (error) {
                  console.error(`检查交易 ${i} 状态失败:`, error);
                  return null;
                }
              })()
            );
          }
          
          const results = await Promise.all(checkPromises);
          pendingTxIds = results.filter(id => id !== null);
          console.log('通过备选方案获取的待处理交易IDs:', pendingTxIds);
        }
        
        // 如果没有待处理交易，则直接返回
        if (!pendingTxIds || pendingTxIds.length === 0) {
          console.log('没有待处理交易');
          setPendingTransactions([]);
          return resolve([]); // 返回空数组，而不是中断流程
        }
        
        // 获取每个交易的详细信息
        const txDetailsPromises = pendingTxIds.map(async (txId) => {
          try {
            console.log(`获取交易 ${txId} 的详细信息...`);
            
            // 获取交易详情
            const txDetail = await publicClient.readContract({
              address: multiSigAddress,
              abi: config.magnetMultiSigABI,
              functionName: 'transactions',
              args: [txId]
            });
            
            console.log(`交易 ${txId} 的原始详情:`, txDetail);
            
            // 获取确认数
            let confirmationCount = 0;
            try {
              confirmationCount = await publicClient.readContract({
                address: multiSigAddress,
                abi: config.magnetMultiSigABI,
                functionName: 'getConfirmationCount',
                args: [txId]
              });
            } catch (countError) {
              console.error(`获取交易 ${txId} 的确认数失败:`, countError);
            }
            
            // 获取确认人列表
            let confirmations = [];
            let hasConfirmed = false;
            
            try {
              confirmations = await publicClient.readContract({
                address: multiSigAddress,
                abi: config.magnetMultiSigABI,
                functionName: 'getConfirmations',
                args: [txId]
              });
              
              // 检查当前用户是否已确认
              hasConfirmed = address ? confirmations.includes(address) : false;
            } catch (confirmationsError) {
              console.error(`获取交易 ${txId} 的确认人列表失败:`, confirmationsError);
              
              // 如果无法获取确认人列表，则尝试逐个检查
              if (address) {
                try {
                  hasConfirmed = await publicClient.readContract({
                    address: multiSigAddress,
                    abi: config.magnetMultiSigABI,
                    functionName: 'confirmations',
                    args: [txId, address]
                  });
                } catch (error) {
                  console.error(`检查当前用户是否确认交易 ${txId} 失败:`, error);
                }
              }
            }
            
            // 组装交易数据
            return {
              id: Number(txId),
              destination: txDetail[0],
              value: formatEther(txDetail[1]),
              executed: txDetail[2],
              data: txDetail[3],
              confirmationCount: Number(confirmationCount),
              confirmations,
              hasConfirmed
            };
          } catch (txError) {
            console.error(`获取交易 ${txId} 的详细信息失败:`, txError);
            return null;
          }
        });
        
        // 等待所有详细信息获取完成
        const txDetailsResults = await Promise.all(txDetailsPromises);
        const txDetails = txDetailsResults.filter(tx => tx !== null);
        
        console.log('处理后的交易详细信息:', txDetails);
        setPendingTransactions(txDetails);
        
        // 返回交易详情，解析Promise
        resolve(txDetails);
        
      } catch (error) {
        console.error('加载待处理交易失败:', error);
        message.error('加载待处理交易失败');
        reject(error);
      }
    });
  };

  // 添加所有者
  const addOwner = async (values) => {
    if (!isConnected || !isMultiSigIniter) {
      message.error('没有权限执行此操作');
      return;
    }

    // 检查当前链是否为MAG链
    if (chainId !== config.magnetNetworkId) {
      message.error(`请切换到Magnet POW链 (ID: ${config.magnetNetworkId}) 再执行操作`);
      return;
    }

    try {
      setLoading(true);
      
      const { ownerAddress } = values;
      
      // 检查钱包客户端是否可用
      if (!walletClient) {
        message.error('无法连接钱包客户端');
        return;
      }
      
      console.log('添加所有者:', {
        address: config.magnetMultiSigAddress,
        chainId: config.magnetNetworkId,
        ownerAddress
      });
      
      // 使用walletClient.writeContract替代writeContract
      const hash = await walletClient.writeContract({
        address: config.magnetMultiSigAddress,
        abi: config.magnetMultiSigABI,
        functionName: 'addOwner',
        args: [ownerAddress]
      });
      
      message.success('交易已提交，等待确认...');
      
      try {
        const receipt = await waitForTransaction({ 
          hash,
          chainId: config.magnetNetworkId // 指定MAG链ID
        });
        
        if (receipt.status === 'success') {
          message.success('所有者添加成功');
          ownerForm.resetFields();
          loadWalletInfo(); // 重新加载钱包信息
        } else {
          message.error('所有者添加失败');
        }
      } catch (txError) {
        console.error('等待交易确认时出错:', txError);
        message.error('等待交易确认时出错，请手动检查交易状态');
        // 即使确认失败，仍然刷新余额，因为交易可能已经成功
        loadWalletInfo();
      }
      
    } catch (error) {
      console.error('添加所有者失败:', error);
      message.error('添加所有者失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 移除所有者
  const removeOwner = async (ownerAddress) => {
    if (!isConnected || !isMultiSigIniter) {
      message.error('没有权限执行此操作');
      return;
    }

    // 检查当前链是否为MAG链
    if (chainId !== config.magnetNetworkId) {
      message.error(`请切换到Magnet POW链 (ID: ${config.magnetNetworkId}) 再执行操作`);
      return;
    }

    try {
      setLoading(true);
      
      // 检查钱包客户端是否可用
      if (!walletClient) {
        message.error('无法连接钱包客户端');
        return;
      }
      
      console.log('移除所有者:', {
        address: config.magnetMultiSigAddress,
        chainId: config.magnetNetworkId,
        functionName: 'removeOwner',
        ownerAddress
      });
      
      // 使用walletClient.writeContract替代writeContract
      const hash = await walletClient.writeContract({
        address: config.magnetMultiSigAddress,
        abi: config.magnetMultiSigABI,
        functionName: 'removeOwner',
        args: [ownerAddress]
      });
      
      message.success('交易已提交，等待确认...');
      
      try {
        const receipt = await waitForTransaction({ 
          hash,
          chainId: config.magnetNetworkId // 指定MAG链ID
        });
        
        if (receipt.status === 'success') {
          message.success('所有者移除成功');
          loadWalletInfo(); // 重新加载钱包信息
        } else {
          message.error('所有者移除失败');
        }
      } catch (txError) {
        console.error('等待交易确认时出错:', txError);
        message.error('等待交易确认时出错，请手动检查交易状态');
        loadWalletInfo();
      }
      
    } catch (error) {
      console.error('移除所有者失败:', error);
      message.error('移除所有者失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 更改确认数要求
  const changeRequirement = async (values) => {
    if (!isConnected || !isMultiSigIniter) {
      message.error('没有权限执行此操作');
      return;
    }

    // 检查当前链是否为MAG链
    if (chainId !== config.magnetNetworkId) {
      message.error(`请切换到Magnet POW链 (ID: ${config.magnetNetworkId}) 再执行操作`);
      return;
    }

    try {
      setLoading(true);
      
      const { requirement } = values;
      
      // 检查钱包客户端是否可用
      if (!walletClient) {
        message.error('无法连接钱包客户端');
        return;
      }
      
      console.log('更新确认要求:', {
        address: config.magnetMultiSigAddress,
        chainId: config.magnetNetworkId,
        functionName: 'changeRequirement',
        requirement
      });
      
      // 使用walletClient.writeContract替代writeContract
      const hash = await walletClient.writeContract({
        address: config.magnetMultiSigAddress,
        abi: config.magnetMultiSigABI,
        functionName: 'changeRequirement',
        args: [requirement]
      });
      
      message.success('交易已提交，等待确认...');
      
      try {
        const receipt = await waitForTransaction({ 
          hash,
          chainId: config.magnetNetworkId // 指定MAG链ID
        });
        
        if (receipt.status === 'success') {
          message.success('确认数要求更新成功');
          requirementForm.resetFields();
          loadWalletInfo(); // 重新加载钱包信息
        } else {
          message.error('确认数要求更新失败');
        }
      } catch (txError) {
        console.error('等待交易确认时出错:', txError);
        message.error('等待交易确认时出错，请手动检查交易状态');
        loadWalletInfo();
      }
    } catch (error) {
      console.error('更新确认数要求失败:', error);
      message.error('更新确认数要求失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 提交新交易
  const submitTransaction = async (values) => {
    if (!isConnected || !isMultiSigOwner) {
      message.error('没有权限执行此操作');
      return;
    }

    // 检查当前链是否为MAG链
    if (chainId !== config.magnetNetworkId) {
      message.error(`请切换到Magnet POW链 (ID: ${config.magnetNetworkId}) 再执行操作`);
      return;
    }

    try {
      setLoading(true);
      
      const { destination, value, data } = values;
      
      // 检查钱包客户端是否可用
      if (!walletClient) {
        message.error('无法连接钱包客户端');
        return;
      }
      
      console.log('提交新交易:', {
        address: config.magnetMultiSigAddress,
        chainId: config.magnetNetworkId,
        functionName: 'submitTransaction',
        destination,
        value: value.toString(),
        data: data || '0x'
      });
      
      // 使用walletClient.writeContract替代writeContract
      const hash = await walletClient.writeContract({
        address: config.magnetMultiSigAddress,
        abi: config.magnetMultiSigABI,
        functionName: 'submitTransaction',
        args: [
          destination,
          parseEther(value.toString()),
          data || '0x', // 如果没有数据，使用空字节
        ]
      });
      
      message.success('交易已提交，等待确认...');
      
      try {
        const receipt = await waitForTransaction({ 
          hash,
          chainId: config.magnetNetworkId // 指定MAG链ID
        });
        
        if (receipt.status === 'success') {
          message.success('交易提交成功');
          transactionForm.resetFields();
          loadPendingTransactions(); // 重新加载交易列表
        } else {
          message.error('交易提交失败');
        }
      } catch (txError) {
        console.error('等待交易确认时出错:', txError);
        message.error('等待交易确认时出错，请手动检查交易状态');
        loadPendingTransactions();
      }
    } catch (error) {
      console.error('提交交易失败:', error);
      message.error('提交交易失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 确认交易
  const confirmTransaction = async (txId) => {
    if (!isConnected || !isMultiSigOwner) {
      message.error('没有权限执行此操作');
      return;
    }

    // 检查当前链是否为MAG链
    if (chainId !== config.magnetNetworkId) {
      message.error(`请切换到Magnet POW链 (ID: ${config.magnetNetworkId}) 再执行操作`);
      return;
    }

    try {
      setLoading(true);
      
      // 检查钱包客户端是否可用
      if (!walletClient) {
        message.error('无法连接钱包客户端');
        return;
      }
      
      console.log('确认交易:', {
        address: config.magnetMultiSigAddress,
        chainId: config.magnetNetworkId,
        functionName: 'confirmTransaction',
        txId
      });
      
      // 使用walletClient.writeContract替代writeContract
      const hash = await walletClient.writeContract({
        address: config.magnetMultiSigAddress,
        abi: config.magnetMultiSigABI,
        functionName: 'confirmTransaction',
        args: [txId]
      });
      
      message.success('确认请求已提交，等待处理...');
      
      try {
        const receipt = await waitForTransaction({ 
          hash,
          chainId: config.magnetNetworkId // 指定MAG链ID
        });
        
        if (receipt.status === 'success') {
          message.success('交易确认成功');
          loadPendingTransactions(); // 重新加载交易列表
        } else {
          message.error('交易确认失败');
        }
      } catch (txError) {
        console.error('等待交易确认时出错:', txError);
        message.error('等待交易确认时出错，请手动检查交易状态');
        loadPendingTransactions();
      }
      
    } catch (error) {
      console.error('确认交易失败:', error);
      message.error('确认交易失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 撤销确认
  const revokeConfirmation = async (txId) => {
    if (!isConnected || !isMultiSigOwner) {
      message.error('没有权限执行此操作');
      return;
    }

    // 检查当前链是否为MAG链
    if (chainId !== config.magnetNetworkId) {
      message.error(`请切换到Magnet POW链 (ID: ${config.magnetNetworkId}) 再执行操作`);
      return;
    }

    try {
      setLoading(true);
      
      // 检查钱包客户端是否可用
      if (!walletClient) {
        message.error('无法连接钱包客户端');
        return;
      }
      
      console.log('撤销确认:', {
        address: config.magnetMultiSigAddress,
        chainId: config.magnetNetworkId,
        functionName: 'revokeConfirmation',
        txId
      });
      
      // 使用walletClient.writeContract替代writeContract
      const hash = await walletClient.writeContract({
        address: config.magnetMultiSigAddress,
        abi: config.magnetMultiSigABI,
        functionName: 'revokeConfirmation',
        args: [txId]
      });
      
      message.success('撤销请求已提交，等待处理...');
      
      try {
        const receipt = await waitForTransaction({ 
          hash,
          chainId: config.magnetNetworkId // 指定MAG链ID
        });
        
        if (receipt.status === 'success') {
          message.success('确认已撤销');
          loadPendingTransactions(); // 重新加载交易列表
        } else {
          message.error('撤销确认失败');
        }
      } catch (txError) {
        console.error('等待交易确认时出错:', txError);
        message.error('等待交易确认时出错，请手动检查交易状态');
        loadPendingTransactions();
      }
      
    } catch (error) {
      console.error('撤销确认失败:', error);
      message.error('撤销确认失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 执行交易
  const executeTransaction = async (txId) => {
    if (!isConnected || !isMultiSigOwner) {
      message.error('没有权限执行此操作');
      return;
    }

    // 检查当前链是否为MAG链
    if (chainId !== config.magnetNetworkId) {
      message.error(`请切换到Magnet POW链 (ID: ${config.magnetNetworkId}) 再执行操作`);
      return;
    }

    try {
      setLoading(true);
      
      // 检查钱包客户端是否可用
      if (!walletClient) {
        message.error('无法连接钱包客户端');
        return;
      }
      
      console.log('执行交易:', {
        address: config.magnetMultiSigAddress,
        chainId: config.magnetNetworkId,
        functionName: 'executeTransaction',
        txId
      });
      
      // 使用walletClient.writeContract替代writeContract
      const hash = await walletClient.writeContract({
        address: config.magnetMultiSigAddress,
        abi: config.magnetMultiSigABI,
        functionName: 'executeTransaction',
        args: [txId]
      });
      
      message.success('执行请求已提交，等待处理...');
      
      try {
        const receipt = await waitForTransaction({ 
          hash,
          chainId: config.magnetNetworkId // 指定MAG链ID
        });
        
        if (receipt.status === 'success') {
          message.success('交易执行成功');
          loadPendingTransactions(); // 重新加载交易列表
          loadWalletInfo(); // 重新加载钱包信息
        } else {
          message.error('交易执行失败');
        }
      } catch (txError) {
        console.error('等待交易确认时出错:', txError);
        message.error('等待交易确认时出错，请手动检查交易状态');
        // 即使确认失败，仍然刷新数据，因为交易可能已经成功
        loadPendingTransactions();
        loadWalletInfo();
      }
      
    } catch (error) {
      console.error('执行交易失败:', error);
      message.error('执行交易失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 紧急提款
  const emergencyWithdraw = async (values) => {
    if (!isConnected || !isMultiSigIniter) {
      message.error('没有权限执行此操作');
      return;
    }

    try {
      setLoading(true);
      
      const { amount, recipient } = values;
      
      // 检查当前链是否为MAG链
      if (chainId !== config.magnetNetworkId) {
        message.error(`请切换到Magnet POW链 (ID: ${config.magnetNetworkId}) 再执行操作`);
        return;
      }
      
      // 检查钱包客户端是否可用
      if (!walletClient) {
        message.error('无法连接钱包客户端');
        return;
      }
      
      console.log('执行紧急提款:', {
        address: config.magnetMultiSigAddress,
        chainId: config.magnetNetworkId,
        functionName: 'emergencyWithdraw',
        amount: amount.toString(),
        recipient
      });
      
      // 使用walletClient.writeContract替代writeContract
      const hash = await walletClient.writeContract({
        address: config.magnetMultiSigAddress,
        abi: config.magnetMultiSigABI,
        functionName: 'emergencyWithdraw',
        args: [
          parseEther(amount.toString()),
          recipient
        ]
      });
      
      message.success('紧急提款请求已提交，等待处理...');
      
      try {
        const receipt = await waitForTransaction({ 
          hash,
          chainId: chainId // 直接使用当前chainId变量而非config变量
        });
        
        if (receipt.status === 'success') {
          message.success('紧急提款成功');
          loadWalletInfo(); // 重新加载钱包信息
        } else {
          message.error('紧急提款失败');
        }
      } catch (txError) {
        console.error('等待交易确认时出错:', txError);
        message.error('等待交易确认时出错，请手动检查交易状态');
        // 即使确认失败，仍然刷新余额，因为交易可能已经成功
        loadWalletInfo();
      }
      
    } catch (error) {
      console.error('紧急提款失败:', error);
      message.error('紧急提款失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 所有者表格列定义
  const ownerColumns = [
    {
      title: '所有者地址',
      dataIndex: 'address',
      key: 'address',
      render: (text) => <Text copyable>{text}</Text>,
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        const isCurrentUser = record.address.toLowerCase() === address?.toLowerCase();
        return isCurrentUser ? <Tag color="green">当前用户</Tag> : <Tag color="blue">所有者</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {isMultiSigIniter && record.address.toLowerCase() !== address?.toLowerCase() && (
            <Button 
              type="primary" 
              danger 
              onClick={() => removeOwner(record.address)}
            >
              移除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 交易表格列定义
  const transactionColumns = [
    {
      title: '交易ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '目标地址',
      dataIndex: 'destination',
      key: 'destination',
      render: (text) => <Text copyable>{text}</Text>,
    },
    {
      title: '金额 (MAG)',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '确认数',
      key: 'confirmations',
      render: (_, record) => (
        <Tooltip title={record.confirmations.map(addr => addr).join('\n')}>
          <span>{record.confirmationCount}/{walletInfo.requiredConfirmations}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        if (record.executed) {
          return <Tag color="green">已执行</Tag>;
        } else if (record.confirmationCount >= walletInfo.requiredConfirmations) {
          return <Tag color="gold">待执行</Tag>;
        } else {
          return <Tag color="blue">待确认</Tag>;
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        if (record.executed) {
          return null;
        }
        
        return (
          <Space>
            {isMultiSigOwner && !record.hasConfirmed && (
              <Button 
                type="primary" 
                onClick={() => confirmTransaction(record.id)}
              >
                确认
              </Button>
            )}
            {isMultiSigOwner && record.hasConfirmed && (
              <Button 
                danger 
                onClick={() => revokeConfirmation(record.id)}
              >
                撤销确认
              </Button>
            )}
            {isMultiSigOwner && record.confirmationCount >= walletInfo.requiredConfirmations && (
              <Button 
                type="primary" 
                onClick={() => executeTransaction(record.id)}
              >
                执行
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  // 初始加载数据 - 增强版
  useEffect(() => {
    // 监听链接状态变化
    if (isConnected && publicClient) {
      console.log('钱包已连接，开始加载多签钱包数据...');
      console.log('当前链 ID:', chainId);
      
      // 先设置加载状态
      setLoading(true);
      
      // 先加载基本信息，然后再加载交易列表
      loadWalletInfo()
        .then(() => {
          // 基本信息加载完成后加载交易列表
          return loadPendingTransactions();
        })
        .catch(error => {
          console.error('数据加载失败:', error);
          message.error('加载多签钱包数据失败，请检查链接状态');
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!isConnected) {
      // 如果钱包未连接，显示提示
      console.log('钱包未连接，无法加载数据');
      // 重置状态以避免显示错误数据
      setWalletInfo({
        owners: [],
        requiredConfirmations: 0,
        balance: '0',
      });
      setPendingTransactions([]);
    }
  }, [isConnected, chainId, publicClient, address]);

  // 如果不是管理员，显示无权限提示
  if (!adminLoading && !isMultiSigOwner && !isMultiSigIniter) {
    return (
      <Card>
        <Title level={3}>多签钱包管理</Title>
        <Text type="danger">您没有权限访问此页面。只有多签钱包的所有者或初始创建者才能访问。</Text>
      </Card>
    );
  }

  return (
    <Spin spinning={loading || adminLoading}>
      <Card className="multisig-card">
        <Title level={3}>多签钱包管理</Title>
        
        {/* 钱包状态信息 */}
        <div className="wallet-status-container">
          <Title level={4}>钱包状态</Title>
          <div className="wallet-status-info">
            <div className="wallet-status-item">
              <Text>当前余额: <Text strong>{walletInfo.balance} MAG</Text></Text>
            </div>
            <div className="wallet-status-item">
              <Text>所需确认数: <Text strong>{walletInfo.requiredConfirmations}</Text></Text>
            </div>
            <div className="wallet-status-item">
              <Text>所有者数量: <Text strong>{walletInfo.owners.length}</Text></Text>
            </div>
          </div>
        </div>
        
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 所有者管理 */}
          <TabPane tab="所有者管理" key="1">
            <div style={{ marginBottom: 20 }}>
              <Title level={4}>当前所有者</Title>
              <Table 
                className="responsive-table"
                dataSource={walletInfo.owners.map(addr => ({ address: addr }))} 
                columns={ownerColumns} 
                rowKey="address" 
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
            </div>
            
            {isMultiSigIniter && (
              <div>
                <Title level={4}>添加所有者</Title>
                <Form
                  form={ownerForm}
                  layout="vertical"
                  onFinish={addOwner}
                  className="multisig-form"
                >
                  <Form.Item
                    name="ownerAddress"
                    label="所有者地址"
                    rules={[{ required: true, message: '请输入所有者地址' }]}
                  >
                    <Input placeholder="输入新所有者钱包地址" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit">
                      添加所有者
                    </Button>
                  </Form.Item>
                </Form>
                
                <Title level={4}>更改确认数要求</Title>
                <Form
                  form={requirementForm}
                  layout="vertical"
                  onFinish={changeRequirement}
                  className="multisig-form"
                >
                  <Form.Item
                    name="requiredConfirmations"
                    label="所需确认数"
                    rules={[
                      { required: true, message: '请输入所需确认数' },
                      { 
                        validator: (_, value) => {
                          if (value > walletInfo.owners.length) {
                            return Promise.reject('确认数不能大于所有者数量');
                          }
                          if (value < 1) {
                            return Promise.reject('确认数必须大于0');
                          }
                          return Promise.resolve();
                        } 
                      }
                    ]}
                  >
                    <InputNumber min={1} max={walletInfo.owners.length} />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit">
                      更新确认数
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}
          </TabPane>
          
          {/* 交易管理 */}
          <TabPane tab="交易管理" key="2">
            <div style={{ marginBottom: 20 }}>
              <Title level={4}>待处理交易</Title>
              <Table 
                className="responsive-table"
                dataSource={pendingTransactions} 
                columns={transactionColumns} 
                rowKey="id" 
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
            </div>
            
            {isMultiSigOwner && (
              <div>
                <Title level={4}>提交新交易</Title>
                <Form
                  form={transactionForm}
                  layout="vertical"
                  onFinish={submitTransaction}
                  className="multisig-form"
                >
                  <Form.Item
                    name="destination"
                    label="目标地址"
                    rules={[{ required: true, message: '请输入目标地址' }]}
                  >
                    <Input placeholder="输入接收者钱包地址" />
                  </Form.Item>
                  <Form.Item
                    name="value"
                    label="金额 (MAG)"
                    rules={[{ required: true, message: '请输入转账金额' }]}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="data"
                    label="数据 (可选)"
                  >
                    <Input placeholder="输入交易数据 (十六进制)" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit">
                      提交交易
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}
          </TabPane>
          
          {/* 紧急操作 */}
          {isMultiSigIniter && (
            <TabPane tab="紧急操作" key="3">
              <div>
                <Title level={4}>紧急提款</Title>
                <Paragraph type="warning">
                  警告：此功能仅用于紧急情况，将绕过多签确认流程。请谨慎使用！
                </Paragraph>
                <Form
                  layout="vertical"
                  onFinish={emergencyWithdraw}
                >
                  <Form.Item
                    name="amount"
                    label="提款金额 (MAG)"
                    rules={[
                      { required: true, message: '请输入提款金额' },
                      { 
                        validator: (_, value) => {
                          if (value > Number(walletInfo.balance)) {
                            return Promise.reject('提款金额不能大于钱包余额');
                          }
                          return Promise.resolve();
                        } 
                      }
                    ]}
                  >
                    <InputNumber min={0} max={Number(walletInfo.balance)} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    name="recipient"
                    label="接收地址"
                    rules={[{ required: true, message: '请输入接收地址' }]}
                  >
                    <Input placeholder="输入接收者钱包地址" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" danger htmlType="submit">
                      执行紧急提款
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </TabPane>
          )}
        </Tabs>
      </Card>
    </Spin>
  );
};

export default MultiSigAdmin;
