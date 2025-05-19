# Cross-Bridge 跨链桥前端

## 项目简介

Cross-Bridge是一个连接BSC和Magnet POW链的去中心化跨链桥前端应用。它允许用户安全地在这两条链之间转移MAG代币，使用多签钱包技术和验证节点确保资产安全。

## 相关项目

MAG跨链桥生态系统由多个组件组成，您可以访问以下相关项目：

- **[跨链桥验证者节点](https://github.com/Lin-xun1113/Validator-service)** - 负责验证和处理跨链交易
- **[跨链桥智能合约](https://github.com/Lin-xun1113/CrossBridge-Contract/)** - 在BSC链上的代币合约与桥接合约，在Magnet链上负责锁定释放资金的多签钱包

## 功能特点

- **双向跨链转账**：支持BSC向Magnet链和Magnet链向BSC的双向资产转移
- **多签钱包安全**：使用多重签名钱包保障用户资产安全
- **实时交易状态**：提供交易状态实时跟踪和更新
- **响应式设计**：完全适配各种屏幕尺寸，提供卓越的移动端体验
- **暗色模式**：支持明亮/暗黑两种主题切换
- **交易历史记录**：查看并跟踪所有历史交易状态

## 技术栈

- **React**：用于构建用户界面的JavaScript库
- **Ant Design**：企业级UI设计语言和React组件库
- **RainbowKit**：连接以太坊钱包的React库，优化的Web3连接体验
- **wagmi**：React Hooks库，用于以太坊交互
- **viem**：以太坊交互的轻量级TypeScript库

## 开发环境设置

### 前提条件

- Node.js (v16+)
- npm 或 yarn
- MetaMask或其他支持的Web3钱包

### 安装步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/Lin-xun1113/Cross-Bridge-frontend.git
   cd Cross-Bridge-frontend
   ```

2. 安装依赖
   ```bash
   npm install
   # 或
   yarn install
   ```

3. 启动开发服务器
   ```bash
   npm start
   # 或
   yarn start
   ```

4. 在浏览器中打开应用
   ```
   http://localhost:3000
   ```

## 使用指南

### 连接钱包

1. 点击页面右上角的“连接钱包”按钮
2. 选择您的钱包类型（MetaMask、WalletConnect等）
3. 授权连接并确认

### 存款（Magnet -> BSC）

1. 在导航菜单的“存款”选项中，确保钱包已连接到Magnet POW链
2. 输入要存入的MAG数量
3. 确认手续费和最终收款量
4. 点击“存款”并确认交易

### 提款（BSC -> Magnet）

1. 在导航菜单的“提款”选项中，确保钱包已连接到BSC测试网
2. 输入要提取的MAG数量和Magnet链上的接收地址
3. 确认手续费和最终收款量
4. 点击“提款”并确认交易

### 查看交易历史

1. 点击导航菜单中的“历史”选项
2. 浏览您的交易历史记录
3. 可以根据类型或状态进行筛选
4. 点击“刷新”按钮更新交易状态

## 安全性考虑

- 多重签名钱包：提款操作需要多重签名验证，提高资金安全性
- 分散式验证节点：多个验证节点共同确认交易有效性
- 交易确认：存款交易需要等待多个区块确认，提款需要等待验证节点确认

## 多签钱包管理

本项目为验证节点和管理员提供了多签钱包管理界面，包含：

- 添加/删除钱包所有者
- 查看待处理交易
- 手动添加交易提案
- 确认或拒绝交易

## 贡献指南

我们欢迎开发者为该项目做出贡献！以下是参与开发的步骤：

1. Fork该仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个Pull Request

## 软件许可证

本项目采用MIT许可证。详细信息请查看项目中的LICENSE文件。

## 联系我们

如果您有任何问题或建议，请通过建立Issue或发送邮件到[linxun1113@gmail.com]与我们联系。

