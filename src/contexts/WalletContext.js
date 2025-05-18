import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { message } from 'antd';
import { CHAINS, CHAIN_IDS, NETWORK_NAMES } from '../config/chains';
import { BSC_CONTRACTS } from '../config/contracts';
import { MAGToken_ABI } from '../config/abis';
import { connectWallet, switchNetwork as switchWeb3Network, listenAccountChanges, listenChainChanges } from '../utils/web3Utils';

// 创建上下文
const WalletContext = createContext();

// 钱包提供者组件
export const WalletProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState('');
  const [networkName, setNetworkName] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [nativeBalance, setNativeBalance] = useState('0');

  // 初始化钱包
  useEffect(() => {
    // 设置事件监听器
    let cleanupAccountListener = () => {};
    let cleanupChainListener = () => {};

    const initWallet = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          console.log('检测到MetaMask钱包');
          // 检查是否已连接
          const result = await connectWallet();
          if (result.success) {
            console.log('已连接账户:', result.account);
            setAccount(result.account);
            setIsConnected(true);
            setProvider(result.provider);
            setSigner(result.provider.getSigner());

            // 获取账户详情
            await updateAccountDetails(result.provider, result.account);

            // 获取网络信息
            handleChainChanged(result.chainId);
          } else {
            console.log('未检测到连接的账户');
          }
          
          // 设置事件监听器（无论是否连接成功都要设置）
          cleanupAccountListener = listenAccountChanges(handleAccountsChanged);
          cleanupChainListener = listenChainChanges(handleChainChanged);
        } catch (error) {
          console.error('初始化钱包失败:', error);
        }
      } else {
        console.warn('未检测到MetaMask钱包，请安装MetaMask插件');
      }
    };

    // 执行初始化
    initWallet();

    // 清理事件监听器
    return () => {
      cleanupAccountListener();
      cleanupChainListener();
    };
  }, []);

  // 账户变更处理
  const handleAccountsChanged = useCallback(async (accounts) => {
    if (accounts.length === 0) {
      // 用户断开钱包
      disconnect();
    } else if (accounts[0] !== account) {
      // 账户已切换
      setAccount(accounts[0]);
      if (provider) {
        await updateAccountDetails(provider, accounts[0]);
      }
      message.info('钱包账户已切换');
    }
  }, [account, provider, disconnect, updateAccountDetails]);

  // 链变更处理
  const handleChainChanged = useCallback(async (chainIdHex) => {
    // 将chainId格式标准化(十进制或十六进制)
    const chainIdStr = typeof chainIdHex === 'number' 
      ? '0x' + chainIdHex.toString(16) 
      : chainIdHex;
    
    setChainId(chainIdStr);

    const networkKey = CHAIN_IDS[chainIdStr] || CHAIN_IDS[parseInt(chainIdStr).toString()] || '未知网络';
    setNetworkName(NETWORK_NAMES[networkKey] || networkKey);

    // 更新代币余额
    if (account && provider) {
      await updateAccountDetails(provider, account);
    }

    message.info(`已切换到${NETWORK_NAMES[networkKey] || '未知网络'}`);
  }, [account, provider, updateAccountDetails]);

  // 更新账户详情（余额等）
  const updateAccountDetails = async (provider, address) => {
    try {
      // 获取原生代币余额
      const balance = await provider.getBalance(address);
      setNativeBalance(ethers.utils.formatEther(balance));

      // 获取当前网络
      const network = await provider.getNetwork();
      const chainIdHex = '0x' + network.chainId.toString(16);
      const networkKey = CHAIN_IDS[chainIdHex];

      // 如果当前在BSC网络，获取MAG代币余额
      if (networkKey === 'BSC' && BSC_CONTRACTS.TOKEN_ADDRESS) {
        const tokenContract = new ethers.Contract(
          BSC_CONTRACTS.TOKEN_ADDRESS,
          MAGToken_ABI,
          provider
        );
        const tokenBal = await tokenContract.balanceOf(address);
        setTokenBalance(ethers.utils.formatEther(tokenBal));
      } else {
        setTokenBalance('0');
      }
    } catch (error) {
      console.error('获取账户详情失败:', error);
    }
  };

  // 连接钱包
  const connect = async () => {
    try {
      console.log('尝试连接钱包...');
      
      // 使用web3Utils的connectWallet函数
      const result = await connectWallet();
      
      if (result.success) {
        console.log('已连接账户:', result.account);
        
        // 设置状态
        setAccount(result.account);
        setProvider(result.provider);
        setSigner(result.signer);
        setIsConnected(true);

        // 获取账户详情
        await updateAccountDetails(result.provider, result.account);

        // 检查并设置当前网络
        handleChainChanged(result.chainId);
        
        message.success('钱包已连接');
        return true;
      } else {
        // 连接失败已在connectWallet函数中显示错误消息
        return false;
      }
    } catch (error) {
      console.error('连接钱包失败:', error);
      message.error('连接钱包失败: ' + (error.message || JSON.stringify(error)));
      return false;
    }
  };

  // 断开钱包连接
  const disconnect = () => {
    setAccount('');
    setIsConnected(false);
    setNetworkName('');
    setChainId('');
    setTokenBalance('0');
    setNativeBalance('0');
    message.success('钱包已断开连接');
  };

  // 切换网络
  const switchNetwork = async (networkKey) => {
    if (!window.ethereum) {
      message.error('请安装MetaMask钱包');
      return false;
    }

    const targetNetwork = CHAINS[networkKey];
    if (!targetNetwork) {
      message.error('无效的网络');
      return false;
    }

    // 使用web3Utils中的switchNetwork函数
    const result = await switchWeb3Network(targetNetwork.chainId, targetNetwork);
    return result;
  };

  // 刷新余额
  const refreshBalance = async () => {
    if (isConnected && provider && account) {
      await updateAccountDetails(provider, account);
    }
  };

  // useEffect依赖项监听事件注册
  useEffect(() => {
    // 已将handleAccountsChanged和handleChainChanged使用useCallback包裹
    // 并在初始化钱包的useEffect中注册事件监听
    // 这个useEffect不需要执行任何操作
  }, [handleAccountsChanged, handleChainChanged]);
  
  // 提供的上下文值
  const value = {
    isConnected,
    account,
    chainId,
    networkName,
    provider,
    signer,
    tokenBalance,
    nativeBalance,
    connect,
    disconnect,
    switchNetwork,
    refreshBalance,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

// 钱包上下文钩子
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;
