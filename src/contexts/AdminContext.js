import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount, usePublicClient, useChainId } from 'wagmi';
import { MAGBridge_ABI, MagnetMultiSig_ABI } from '../config/abis';
import { config } from '../config';

const AdminContext = createContext();

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [isBridgeOwner, setIsBridgeOwner] = useState(false);
  const [isMultiSigOwner, setIsMultiSigOwner] = useState(false);
  const [isMultiSigIniter, setIsMultiSigIniter] = useState(false);
  const [isBridgeValidator, setIsBridgeValidator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('检查管理员状态 - 开始:', { isConnected, address, chainId });
      
      // 确保钱包已连接、地址存在且chainId正确
      if (!isConnected || !address) {
        console.log('未连接钱包或地址为空');
        setIsBridgeOwner(false);
        setIsMultiSigOwner(false);
        setIsMultiSigIniter(false);
        setIsBridgeValidator(false);
        setLoading(false);
        return;
      }
      
      // 检查是否在BSC测试网上 (chainId = 97)
      if (chainId !== 97) {
        console.log('非BSC测试网，无法检查管理员权限, 当前chainId:', chainId);
        setIsBridgeOwner(false);
        setIsMultiSigOwner(false);
        setIsMultiSigIniter(false);
        setIsBridgeValidator(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('开始检查合约权限...');
        console.log('当前地址:', address);
        console.log('合约地址:', {
          bscBridgeAddress: config.bscBridgeAddress,
          magnetMultiSigAddress: config.magnetMultiSigAddress
        });
        
        // 打印ABI信息和公共客户端
        console.log('publicClient:', publicClient);
        console.log('合约ABI信息:', {
          magBridgeABI: config.magBridgeABI ? '已加载' : '未加载',
          magnetMultiSigABI: config.magnetMultiSigABI ? '已加载' : '未加载'
        });
        
        // 检查ABI中是否包含INITER
        if (config.magnetMultiSigABI) {
          const hasIniter = config.magnetMultiSigABI.some(item => 
            (item.type === 'function' && item.name === 'INITER') || 
            (item.type === 'event' && item.name === 'INITER') ||
            (item.stateMutability === 'view' && item.name === 'INITER')
          );
          console.log('ABI中是否包含INITER:', hasIniter);
          
          // 查找所有可能与INITER相关的项
          const initerRelated = config.magnetMultiSigABI.filter(item => 
            item.name && item.name.toLowerCase().includes('init')
          );
          console.log('与INITER相关的ABI项:', initerRelated);
        }
        
        if (!publicClient) {
          console.log('publicClient 不可用，使用备用方案');
          // 备用方案：使用特定地址列表
          const adminAddresses = [
            '0x01598CdD08c9737a84ead88BAaED1ed4c3330cD2'
          ];
          
          const normalizedAddress = address ? address.toLowerCase() : '';
          const isAdmin = adminAddresses.some(admin => admin.toLowerCase() === normalizedAddress);
          
          setIsBridgeOwner(isAdmin);
          setIsBridgeValidator(isAdmin);
          setIsMultiSigOwner(isAdmin);
          setIsMultiSigIniter(isAdmin);
          setLoading(false);
          return;
        }
        
        // 准备调用合约
        const contracts = [
          {
            address: config.bscBridgeAddress,
            abi: config.magBridgeABI,
            functionName: 'owner',
          },
          {
            address: config.bscBridgeAddress,
            abi: config.magBridgeABI,
            functionName: 'validators',
            args: [address],
          },
          {
            address: config.magnetMultiSigAddress,
            abi: config.magnetMultiSigABI,
            functionName: 'isOwner',
            args: [address],
          },
          {
            address: config.magnetMultiSigAddress,
            abi: config.magnetMultiSigABI,
            functionName: 'INITER', // INITER是一个状态变量，而不是函数
          }
        ];
        
        console.log('准备调用合约函数:', contracts);
        
        // 使用multicall一次请求多个状态
        console.log('开始执行multicall...');
        
        // 增加安全检查 - 确保是在BSC测试网上
        if (chainId !== 97 || !publicClient) {
          throw new Error('链网络错误或公共客户端不可用');
        }
        
        // 使用try-catch包裹multicall调用
        let results;
        try {
          results = await publicClient.multicall({
            contracts: contracts,
          });
        } catch (mcError) {
          console.error('Multicall调用失败:', mcError);
          throw new Error('合约调用失败: ' + mcError.message);
        }
        
        // 自定义BigInt序列化处理
        console.log('原始multicall结果:', JSON.stringify(results, (key, value) => {
          // 将BigInt转换为字符串
          return typeof value === 'bigint' ? value.toString() : value;
        }, 2));
        
        // 处理结果
        const bridgeOwner = results[0]?.status === 'success' ? results[0].result : '0x0000000000000000000000000000000000000000';
        const isValidator = results[1]?.status === 'success' ? results[1].result : false;
        const isOwner = results[2]?.status === 'success' ? results[2].result : false;
        const initer = results[3]?.status === 'success' ? results[3].result : '0x0000000000000000000000000000000000000000';
        
        console.log('详细的合约返回结果:');
        console.log('- bridgeOwner:', bridgeOwner, typeof bridgeOwner);
        console.log('- isValidator:', isValidator, typeof isValidator);
        console.log('- isOwner:', isOwner, typeof isOwner);
        console.log('- initer (INITER):', initer, typeof initer);
        console.log('- 当前地址:', address, typeof address);
        
        // 检查是否为跨链桥所有者
        const normalizedAddress = address ? address.toLowerCase() : '';
        const isBridgeOwnerResult = bridgeOwner.toLowerCase() === normalizedAddress;
        
        // 检查是否为多签钱包初始创建者
        console.log('INITER比较:', {
          initer: initer ? initer.toLowerCase() : null,
          normalizedAddress,
          isEqual: initer && normalizedAddress ? initer.toLowerCase() === normalizedAddress : false
        });
        
        const isMultiSigIniterResult = initer && normalizedAddress ? initer.toLowerCase() === normalizedAddress : false;
        
        console.log('权限检查结果:');
        console.log('- 是否为跨链桥所有者:', isBridgeOwnerResult);
        console.log('- 是否为跨链桥验证者:', isValidator);
        console.log('- 是否为多签钱包所有者:', isOwner);
        console.log('- 是否为多签钱包初始创建者:', isMultiSigIniterResult);

        // 直接在控制台打印合约地址和管理员信息
        console.log('====== 合约管理员信息 ======');
        console.log('当前连接地址:', address);
        console.log('跨链桥合约地址:', config.bscBridgeAddress);
        console.log('多签钱包合约地址:', config.magnetMultiSigAddress);
        console.log('============================');
        
        console.log('权限判断结果:');
        console.log('- 是否为跨链桥所有者:', isBridgeOwnerResult);
        console.log('- 是否为跨链桥验证者:', isValidator);
        console.log('- 是否为多签钱包所有者:', isOwner, typeof isOwner);
        console.log('- 是否为多签钱包初始创建者:', isMultiSigIniterResult);
        
        // 临时调试代码 - 指定地址的设置
        const testMultiSigEnabled = true; // 测试时设置为true
        const isSpecialAddress = address && address.toLowerCase() === '0x01598CdD08c9737a84ead88BAaED1ed4c3330cD2'.toLowerCase();
        const shouldEnableMultiSig = testMultiSigEnabled && isSpecialAddress;
        console.log('是否启用多签钱包管理:', shouldEnableMultiSig, '当前地址:', address);
        
        // 跨链桥管理权限设置
        setIsBridgeOwner(isBridgeOwnerResult);
        setIsBridgeValidator(isValidator);
        
        // 多签钱包管理权限设置 (仅在测试时使用特殊地址)
        setIsMultiSigOwner(shouldEnableMultiSig || isOwner);
        setIsMultiSigIniter(shouldEnableMultiSig || isMultiSigIniterResult);
      } catch (error) {
        console.error('检查管理员状态时出错:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [address, isConnected]);

  const value = {
    isBridgeOwner,
    isMultiSigOwner,
    isMultiSigIniter,
    isBridgeValidator,
    loading,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};
