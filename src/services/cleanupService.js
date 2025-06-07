import { cleanupAllExpiredOperations } from './collaborationService';

// 清理服务类
class CleanupService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    // 默认每小时清理一次
    this.cleanupInterval = 60 * 60 * 1000; // 1小时
    // 删除2小时前的记录
    this.maxAgeHours = 2;
  }

  // 启动自动清理
  start() {
    if (this.isRunning) {
      console.log('清理服务已在运行');
      return;
    }

    console.log('启动协作记录清理服务');
    this.isRunning = true;

    // 立即执行一次清理
    this.performCleanup();

    // 设置定时清理
    this.intervalId = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  // 停止自动清理
  stop() {
    if (!this.isRunning) {
      console.log('清理服务未在运行');
      return;
    }

    console.log('停止协作记录清理服务');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // 执行清理操作
  async performCleanup() {
    try {
      console.log('开始清理过期协作记录...');
      const deletedCount = await cleanupAllExpiredOperations(this.maxAgeHours);

      if (deletedCount > 0) {
        console.log(`清理完成，共删除 ${deletedCount} 条过期记录`);
      }
    } catch (error) {
      console.error('自动清理失败:', error);
    }
  }

  // 手动触发清理
  async triggerCleanup() {
    return this.performCleanup();
  }

  // 设置清理间隔（分钟）
  setCleanupInterval(minutes) {
    this.cleanupInterval = minutes * 60 * 1000;

    if (this.isRunning) {
      // 重启定时器
      this.stop();
      this.start();
    }
  }

  // 设置最大保留时间（小时）
  setMaxAge(hours) {
    this.maxAgeHours = hours;
  }

  // 获取状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      cleanupInterval: this.cleanupInterval,
      maxAgeHours: this.maxAgeHours
    };
  }
}

// 创建单例实例
const cleanupService = new CleanupService();

export default cleanupService;

// 便捷方法
export const startCleanupService = () => cleanupService.start();
export const stopCleanupService = () => cleanupService.stop();
export const triggerManualCleanup = () => cleanupService.triggerCleanup();