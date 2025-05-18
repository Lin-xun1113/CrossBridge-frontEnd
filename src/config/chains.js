// 链配置文件
export const CHAINS = {
  BSC: {
    chainId: '0x61',  // 97
    chainName: 'BSC Testnet',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    rpcUrls: ['https://data-seed-prebsc-2-s1.binance.org:8545/'],
    blockExplorerUrls: ['https://bscscan.com/'],
  },
  MAGNET: {
    chainId: '0x1BF52',  // 114514
    chainName: 'Magnet POW Chain',
    nativeCurrency: {
      name: 'MAG',
      symbol: 'MAG',
      decimals: 18,
    },
    rpcUrls: ['https://node1.magnetchain.xyz'],
    blockExplorerUrls: ['https://magnet.tryethernal.com/'],
  },
};

// 网络ID映射
export const CHAIN_IDS = {
  '0x4A': 'BSC',
  '74': 'BSC',
  '0x1BF52': 'MAGNET',
  '114514': 'MAGNET',
};

// 网络名称显示
export const NETWORK_NAMES = {
  BSC: 'BSC测试网',
  MAGNET: 'Magnet POW链',
};
