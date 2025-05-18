import { useAccount, useChainId, useBalance, useDisconnect, useSwitchChain, useClient } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';

/**
 * WalletAdapter钩子函数
 * 将RainbowKit/wagmi的API适配为原来WalletContext的形式
 * 这样就可以不修改BridgeContext等代码直接使用
 */
export const useWallet = () => {
  // 获取wagmi提供的钩子
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const client = useClient();

  // 将chain.id转换为网络名称
  const getNetworkName = (chainId) => {
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

  // 创建与原WalletContext匹配的接口
  return {
    isConnected,
    account: address,
    chainId: chainId ? `0x${chainId.toString(16)}` : null,
    networkName: chainId ? getNetworkName(chainId) : '',
    provider: client.transport, // 这里可能需要调整，保证与ethers兼容
    signer: client.transport, // 这里可能需要调整，保证与ethers签名者兼容
    nativeBalance: balance?.formatted || '0',
    // 函数
    connect: openConnectModal,
    disconnect,
    switchNetwork: async (networkKey) => {
      // 将networkKey转换为chainId
      let chainId;
      switch(networkKey.toUpperCase()) {
        case 'BSC':
          chainId = 56;
          break;
        case 'BSC_TESTNET':
          chainId = 97;
          break;
        case 'MAGNET':
          chainId = 114514;
          break;
        default:
          return false;
      }
      
      try {
        await switchChain({ chainId });
        return true;
      } catch (error) {
        console.error('切换网络失败:', error);
        return false;
      }
    },
    refreshBalance: () => {}, // 这个函数在RainbowKit中可能不需要，因为它会自动刷新
  };
};
