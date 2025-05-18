import { ethers } from 'ethers';
import { message } from 'antd';

/**
 * 连接MetaMask钱包
 * @returns {Promise<{provider, signer, account}>} 返回provider, signer和account
 */
export const connectWallet = async () => {
  // 检查是否安装了MetaMask
  if (typeof window.ethereum === 'undefined') {
    message.error('请安装MetaMask钱包插件');
    return { success: false };
  }

  try {
    console.log('请求连接MetaMask...');
    
    // 使用EIP-1193标准的request方法请求账户访问
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('未获取到账户');
    }
    
    console.log('已连接账户:', accounts[0]);
    
    // 创建provider和signer
    const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    const signer = provider.getSigner();
    const account = accounts[0];
    
    // 获取当前链ID
    const { chainId } = await provider.getNetwork();
    
    return {
      success: true,
      provider,
      signer,
      account,
      chainId: '0x' + chainId.toString(16)
    };
  } catch (error) {
    console.error('连接钱包失败:', error);
    
    if (error.code === 4001) {
      // 用户拒绝连接
      message.error('用户拒绝连接钱包');
    } else if (error.code === -32002) {
      // 已经有一个待处理的连接请求
      message.info('钱包连接请求正在处理中，请检查MetaMask插件');
    } else {
      message.error('连接钱包失败: ' + (error.message || JSON.stringify(error)));
    }
    
    return { success: false };
  }
};

/**
 * 获取钱包余额
 * @param {string} address 钱包地址
 * @param {object} provider ethers provider
 * @returns {Promise<string>} 格式化后的余额
 */
export const getWalletBalance = async (address, provider) => {
  try {
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error('获取余额失败:', error);
    return '0';
  }
};

/**
 * 切换网络
 * @param {string} chainId 目标链ID (十六进制)
 * @param {object} chainParams 链参数
 * @returns {Promise<boolean>} 是否成功切换
 */
export const switchNetwork = async (chainId, chainParams) => {
  if (typeof window.ethereum === 'undefined') {
    message.error('请安装MetaMask钱包插件');
    return false;
  }
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }]
    });
    return true;
  } catch (error) {
    // 如果链不存在，尝试添加
    if (error.code === 4902 && chainParams) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [chainParams]
        });
        return true;
      } catch (addError) {
        console.error('添加网络失败:', addError);
        message.error('添加网络失败');
        return false;
      }
    }
    
    console.error('切换网络失败:', error);
    message.error('切换网络失败: ' + (error.message || ''));
    return false;
  }
};

/**
 * 监听账户变化
 * @param {Function} handleAccountsChanged 账户变化处理函数
 */
export const listenAccountChanges = (handleAccountsChanged) => {
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }
  return () => {};
};

/**
 * 监听链变化
 * @param {Function} handleChainChanged 链变化处理函数
 */
export const listenChainChanges = (handleChainChanged) => {
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }
  return () => {};
};
