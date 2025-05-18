import { BSC_CONTRACTS, MAGNET_CONTRACTS } from './contracts';
import { MAGBridge_ABI, MagnetMultiSig_ABI } from './abis';

export const config = {
  // BSC测试网合约地址
  bscBridgeAddress: BSC_CONTRACTS.BRIDGE_ADDRESS,
  bscTokenAddress: BSC_CONTRACTS.TOKEN_ADDRESS,
  
  // Magnet POW链上的多签钱包地址
  magnetMultiSigAddress: MAGNET_CONTRACTS.MULTISIG_ADDRESS,
  
  // 合约ABI
  magBridgeABI: MAGBridge_ABI,
  magnetMultiSigABI: MagnetMultiSig_ABI,
  
  // 网络ID
  bscNetworkId: 97, // BSC测试网ID
  magnetNetworkId: 114514, // Magnet POW链ID
  
  // 默认使用BSC测试网ID
  networkId: 97 // 向后兼容，历史原因保留
};
