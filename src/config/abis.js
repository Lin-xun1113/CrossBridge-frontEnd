// MAGBridge合约ABI - 使用JSON对象格式
export const MAGBridge_ABI = [
  // 查询合约所有者 (Ownable接口)
  {
    type: 'function',
    name: 'owner',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view'
  },
  
  // 查询是否为验证者
  {
    type: 'function',
    name: 'validators',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  
  // 查询最小确认数
  {
    type: 'function',
    name: 'minConfirmations',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  
  // 手续费收集地址
  {
    type: 'function',
    name: 'feeCollector',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view'
  },
  
  // 收集的手续费总额
  {
    type: 'function',
    name: 'collectedFees',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  
  // 查询桥接是否暂停
  {
    type: 'function',
    name: 'paused',
    inputs: [],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  
  // 暂停/恢复合约操作
  {
    type: 'function',
    name: 'pause',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'unpause',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  
  // 发起提款(BSC -> Magnet)
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { type: 'string', name: 'magnetAddress' },
      { type: 'uint256', name: 'amount' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  
  // 查询交易是否已处理
  {
    type: 'function',
    name: 'processedTransactions',
    inputs: [{ type: 'bytes32', name: 'txHash' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  
  // 查询手续费率
  {
    type: 'function',
    name: 'feePercentage',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  
  // 查询交易限额
  {
    type: 'function',
    name: 'maxTransactionAmount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'minTransactionAmount',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'dailyTransactionLimit',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'dailyTransactionTotal',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },

  // 提取累计的手续费
  {
    type: 'function',
    name: 'withdrawFees',
    inputs: [
      { type: 'address', name: 'recipient' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  
  // 事件
  {
    type: 'event',
    name: 'CrossChainTransfer',
    inputs: [
      { type: 'address', name: 'from', indexed: true },
      { type: 'address', name: 'to', indexed: true },
      { type: 'uint256', name: 'amount', indexed: false },
      { type: 'uint256', name: 'fee', indexed: false },
      { type: 'uint256', name: 'timestamp', indexed: false },
      { type: 'bytes32', name: 'txHash', indexed: false },
      { type: 'uint256', name: 'confirmations', indexed: false },
      { type: 'string', name: 'status', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'CrossChainWithdraw',
    inputs: [
      { type: 'address', name: 'from', indexed: true },
      { type: 'string', name: 'destinationAddress', indexed: false },
      { type: 'uint256', name: 'amount', indexed: false },
      { type: 'uint256', name: 'fee', indexed: false },
      { type: 'uint256', name: 'timestamp', indexed: false },
      { type: 'string', name: 'status', indexed: false }
    ]
  }
];

// MAG代币合约ABI - 使用JSON对象格式
export const MAGToken_ABI = [
  // 查询余额
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ type: 'address', name: 'account' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  
  // 授权合约花费代币
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { type: 'address', name: 'spender' },
      { type: 'uint256', name: 'amount' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  
  // 查询授权额度
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { type: 'address', name: 'owner' },
      { type: 'address', name: 'spender' }
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },

  // 代币信息
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view'
  }
];

// MagnetMultiSig合约ABI - 使用JSON对象格式
export const MagnetMultiSig_ABI = [
  // 初始创建者地址 - 特殊权限
  {
    type: 'function',
    name: 'INITER',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view'
  },
  
  // 检查是否为所有者
  {
    type: 'function',
    name: 'isOwner',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  
  // 查询交易详情
  {
    type: 'function',
    name: 'transactions',
    inputs: [{ type: 'uint256', name: 'transactionId' }],
    outputs: [
      { type: 'address', name: 'destination' },
      { type: 'uint256', name: 'value' },
      { type: 'bool', name: 'executed' },
      { type: 'bytes', name: 'data' }
    ],
    stateMutability: 'view'
  },
  
  // 查询确认状态
  {
    type: 'function',
    name: 'confirmations',
    inputs: [
      { type: 'uint256', name: 'transactionId' },
      { type: 'address', name: 'owner' }
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  
  // 查询所需确认数
  {
    type: 'function',
    name: 'requiredConfirmations',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  
  // 查询当前确认数
  {
    type: 'function',
    name: 'getConfirmationCount',
    inputs: [{ type: 'uint256', name: 'transactionId' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view'
  },
  
  // 查询所有待处理交易
  {
    type: 'function',
    name: 'getPendingTransactions',
    inputs: [],
    outputs: [{ type: 'uint256[]' }],
    stateMutability: 'view'
  },
  
  // 查询确认人列表
  {
    type: 'function',
    name: 'getConfirmations',
    inputs: [{ type: 'uint256', name: 'transactionId' }],
    outputs: [{ type: 'address[]' }],
    stateMutability: 'view'
  },
  
  // 查询所有者列表
  {
    type: 'function',
    name: 'getOwners',
    inputs: [],
    outputs: [{ type: 'address[]' }],
    stateMutability: 'view'
  },
  
  // 添加所有者
  {
    type: 'function',
    name: 'addOwner',
    inputs: [{ type: 'address', name: 'owner' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  
  // 移除所有者
  {
    type: 'function',
    name: 'removeOwner',
    inputs: [{ type: 'address', name: 'owner' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  
  // 更改确认数要求
  {
    type: 'function',
    name: 'changeRequirement',
    inputs: [{ type: 'uint256', name: 'required' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  
  // 紧急提款
  {
    type: 'function',
    name: 'emergencyWithdraw',
    inputs: [
      { type: 'uint256', name: 'amount' },
      { type: 'address', name: 'recipient', internalType: 'address payable' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  
  // 事件
  {
    type: 'event',
    name: 'Submission',
    inputs: [{ type: 'uint256', name: 'transactionId', indexed: true }]
  },
  {
    type: 'event',
    name: 'Confirmation',
    inputs: [
      { type: 'address', name: 'sender', indexed: true },
      { type: 'uint256', name: 'transactionId', indexed: true }
    ]
  },
  {
    type: 'event',
    name: 'Execution',
    inputs: [{ type: 'uint256', name: 'transactionId', indexed: true }]
  },
  {
    type: 'event',
    name: 'OwnerAddition',
    inputs: [{ type: 'address', name: 'owner', indexed: true }]
  },
  {
    type: 'event',
    name: 'OwnerRemoval',
    inputs: [{ type: 'address', name: 'owner', indexed: true }]
  },
  {
    type: 'event',
    name: 'RequirementChange',
    inputs: [{ type: 'uint256', name: 'required' }]
  },
  {
    type: 'event',
    name: 'EmergencyWithdrawal',
    inputs: [
      { type: 'address', name: 'initiator', indexed: true },
      { type: 'address', name: 'recipient', indexed: true },
      { type: 'uint256', name: 'amount' }
    ]
  }
];
