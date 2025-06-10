## 文件结构
```
src/
├── assets/              # 静态资源（图片、字体）
├── components/          # 通用组件库（按钮等）
├── contexts/            # 状态管理
├── features/            # 各页面模块
├── hooks/               # 自定义Hooks（主题切换等）
├── router/              # 路由配置
├── services/            # 服务层
├── styles/              # 全局样式与CSS变量
├── utils/               # 工具方法集合
```

## 如何体验

前提条件：安装node.js 与 npm，由于服务部署在外网，需要本机能够访问外网

安装所有依赖
```
npm install
```

构建
```
npm run build
```

访问构建后网页开始体验
```
npm run preview
```

## 如何开发

安装所有依赖
```
npm install
```

本地运行
```
npm run dev
```

提交（先git add，建议使用npm指令提交统一commit格式）
```
npm run commit
```