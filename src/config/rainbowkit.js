import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';

// 自定义Magnet链配置
const magnetPOW = {
  id: 114514,
  name: 'Magnet POW',
  network: 'magnetpow',
  nativeCurrency: {
    name: 'MAG',
    symbol: 'MAG',
    decimals: 18,
  },
  rpcUrls: {
    public: { http: ['https://node1.magnetchain.xyz'] },
    default: { http: ['https://node1.magnetchain.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MagnetScan', url: 'https://scan.magnetchain.xyz' },
  },
};

// 配置支持的链
const chains = [bsc, bscTestnet, magnetPOW];

// 创建RainbowKit配置
const config = getDefaultConfig({
  appName: 'Cross-Bridge',
  projectId: '228cb184195d2bd67f4b56591f8da0c9', // 您可能需要在WalletConnect官网申请一个projectId
  chains: chains,
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http('https://data-seed-prebsc-2-s1.binance.org:8545/'),
    [magnetPOW.id]: http('https://node1.magnetchain.xyz'),
  },
});

export { config, chains };
