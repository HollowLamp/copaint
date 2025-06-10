import { firestore } from './firebase';
import { collection, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

// 清理配置 - 降低清理频率，减少数据库负载
const CLEANUP_CONFIG = {
  // 协作操作保留时间（从2小时增加到6小时）
  COLLABORATION_MAX_AGE_HOURS: 6,
  // 清理批次大小
  BATCH_SIZE: 100,
  // 清理间隔（从每小时增加到每3小时）
  CLEANUP_INTERVAL_MS: 3 * 60 * 60 * 1000, // 3小时
};

let cleanupTimer = null;
let isCleanupRunning = false;

// 清理过期的协作操作记录
export async function cleanupExpiredCollaborations() {
  if (isCleanupRunning) {
    console.log('清理任务已在运行中，跳过');
    return;
  }

  isCleanupRunning = true;
  console.log('开始清理过期协作记录...');

  try {
    const expiredTime = new Date(Date.now() - CLEANUP_CONFIG.COLLABORATION_MAX_AGE_HOURS * 60 * 60 * 1000);

    const collaborationsRef = collection(firestore, 'collaborations');
    const q = query(
      collaborationsRef,
      where('timestamp', '<', expiredTime)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('没有需要清理的协作记录');
      return;
    }

    // 使用批量删除，提高效率
    const batch = writeBatch(firestore);
    let deleteCount = 0;

    snapshot.docs.forEach((doc, index) => {
      if (index < CLEANUP_CONFIG.BATCH_SIZE) {
        batch.delete(doc.ref);
        deleteCount++;
      }
    });

    if (deleteCount > 0) {
      await batch.commit();
      console.log(`已清理 ${deleteCount} 条过期协作记录`);
    }

    // 如果还有更多记录需要清理，延迟执行下一批
    if (snapshot.docs.length > CLEANUP_CONFIG.BATCH_SIZE) {
      setTimeout(() => {
        cleanupExpiredCollaborations();
      }, 5000); // 5秒后清理下一批
    }

  } catch (error) {
    console.error('清理过期协作记录失败:', error);
  } finally {
    isCleanupRunning = false;
  }
}

// 启动定期清理任务
export function startCleanupScheduler() {
  if (cleanupTimer) {
    console.log('清理调度器已在运行');
    return;
  }

  console.log(`启动清理调度器，间隔：${CLEANUP_CONFIG.CLEANUP_INTERVAL_MS / 1000 / 60}分钟`);

  // 立即执行一次清理
  cleanupExpiredCollaborations();

  // 设置定期清理
  cleanupTimer = setInterval(() => {
    cleanupExpiredCollaborations();
  }, CLEANUP_CONFIG.CLEANUP_INTERVAL_MS);
}

// 停止清理调度器
export function stopCleanupScheduler() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log('清理调度器已停止');
  }
}

// 手动触发清理（降低频率调用）
export async function triggerManualCleanup() {
  // 添加防抖，避免频繁手动清理
  if (triggerManualCleanup.lastCall && Date.now() - triggerManualCleanup.lastCall < 300000) {
    console.log('手动清理被防抖限制（5分钟内只能触发一次）');
    return;
  }

  triggerManualCleanup.lastCall = Date.now();
  await cleanupExpiredCollaborations();
}