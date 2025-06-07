import { firestore } from './firebase';
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  deleteDoc
} from 'firebase/firestore';

// 协作操作类型
export const OPERATION_TYPES = {
  CANVAS_UPDATE: 'canvas_update',     // 画布更新
  OBJECT_ADD: 'object_add',           // 添加对象
  OBJECT_UPDATE: 'object_update',     // 更新对象
  OBJECT_DELETE: 'object_delete',     // 删除对象
  CURSOR_MOVE: 'cursor_move',         // 光标移动
  USER_JOIN: 'user_join',             // 用户加入
  USER_LEAVE: 'user_leave'            // 用户离开
};

// 检查用户是否有文件的基础访问权限（包括所有者和协作者）
export function checkFileAccess(collaborators, ownerId, userId) {
  if (!userId) return false;

  // 文件所有者总是有访问权限
  if (ownerId === userId) return true;

  // 检查是否在协作者列表中
  const userCollaborator = collaborators?.find(c => c.userId === userId);
  return !!userCollaborator;
}

// 检查特定权限
export function checkPermission(collaborators, userId, requiredPermission) {
  const userCollaborator = collaborators?.find(c => c.userId === userId);
  if (!userCollaborator) return false;

  const permissions = ['none', 'read', 'edit'];
  const userPermissionLevel = permissions.indexOf(userCollaborator.permission);
  const requiredLevel = permissions.indexOf(requiredPermission);

  return userPermissionLevel >= requiredLevel;
}

// 实时监听文件变化
export function subscribeToFileChanges(fileId, callback) {
  const fileRef = doc(firestore, 'files', fileId);

  return onSnapshot(fileRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        fileId,
        content: data.content,
        collaborators: data.collaborators,
        lastEditTime: data.lastEditTime,
        ownerId: data.ownerId
      });
    }
  });
}

// 实时监听协作操作
export function subscribeToCollaborationOperations(fileId, callback) {
  const operationsRef = collection(firestore, 'collaborations');
  const q = query(
    operationsRef,
    where('fileId', '==', fileId),
    where('timestamp', '>', new Date(Date.now() - 300000)), // 监听最近5分钟的操作，减少查询频率
    orderBy('timestamp', 'desc'),
    limit(20) // 减少限制数量
  );

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const operation = { id: change.doc.id, ...change.doc.data() };
        // 只处理最近30秒的操作，进一步减少处理量
        if (operation.timestamp && operation.timestamp.toDate() > new Date(Date.now() - 30000)) {
          callback(operation);
        }
      }
    });
  });
}

// 缓存最后清理时间，避免频繁清理
const lastCleanupCache = new Map();

// 广播协作操作
export async function broadcastOperation(fileId, userId, operationType, data) {
  try {
    // 插入新的协作记录
    await addDoc(collection(firestore, 'collaborations'), {
      fileId,
      userId,
      operationType,
      data,
      timestamp: serverTimestamp()
    });

    // 定期清理过期记录（避免频繁清理）
    const now = Date.now();
    const lastCleanup = lastCleanupCache.get(fileId) || 0;

    // 每5分钟最多清理一次，或者随机触发（10%概率）
    if (now - lastCleanup > 300000 || Math.random() < 0.1) {
      // 异步清理，不阻塞主要操作
      cleanupExpiredOperations(fileId).then(() => {
        lastCleanupCache.set(fileId, now);
        console.log(`已清理文件 ${fileId} 的过期协作记录`);
      }).catch(error => {
        console.warn('清理过期协作记录失败:', error);
      });
    }
  } catch (error) {
    console.error('广播操作失败:', error);
    throw error;
  }
}

// 防抖缓存，避免重复更新
const updateDebounceCache = new Map();

// 更新文件内容（带权限检查和防抖）
export async function updateFileContent(fileId, userId, content) {
  try {
    // 防抖检查，同一文件ID在500ms内只能更新一次
    const cacheKey = `${fileId}_${userId}`;
    const now = Date.now();
    const lastUpdate = updateDebounceCache.get(cacheKey);

    if (lastUpdate && (now - lastUpdate) < 500) {
      console.log('防抖跳过更新:', fileId);
      return;
    }

    updateDebounceCache.set(cacheKey, now);

    // 获取文件信息检查权限
    const fileRef = doc(firestore, 'files', fileId);
    const fileSnap = await getDoc(fileRef);

    if (!fileSnap.exists()) {
      throw new Error('文件不存在');
    }

    const fileData = fileSnap.data();

    // 检查是否是文件所有者或有编辑权限
    if (fileData.ownerId !== userId &&
        !checkPermission(fileData.collaborators, userId, 'edit')) {
      throw new Error('无编辑权限');
    }

    // 更新文件内容
    await updateDoc(fileRef, {
      content,
      lastEditTime: serverTimestamp()
    });

    // 不再单独广播操作，文件更新会触发监听器
    console.log('文件内容更新成功:', fileId);

  } catch (error) {
    console.error('更新文件内容失败:', error);
    throw error;
  }
}

// 添加协作者
export async function addCollaborator(fileId, ownerId, userId, permission = 'read') {
  try {
    const fileRef = doc(firestore, 'files', fileId);
    const fileSnap = await getDoc(fileRef);

    if (!fileSnap.exists()) {
      throw new Error('文件不存在');
    }

    const fileData = fileSnap.data();

    // 检查是否是文件所有者
    if (fileData.ownerId !== ownerId) {
      throw new Error('只有文件所有者可以添加协作者');
    }

    const collaborators = fileData.collaborators || [];

    // 检查用户是否已经是协作者
    const existingIndex = collaborators.findIndex(c => c.userId === userId);

    if (existingIndex >= 0) {
      // 更新权限
      collaborators[existingIndex].permission = permission;
    } else {
      // 添加新协作者
      collaborators.push({ userId, permission });
    }

    await updateDoc(fileRef, {
      collaborators
    });

    return true;
  } catch (error) {
    console.error('添加协作者失败:', error);
    throw error;
  }
}

// 移除协作者
export async function removeCollaborator(fileId, ownerId, userId) {
  try {
    const fileRef = doc(firestore, 'files', fileId);
    const fileSnap = await getDoc(fileRef);

    if (!fileSnap.exists()) {
      throw new Error('文件不存在');
    }

    const fileData = fileSnap.data();

    // 检查是否是文件所有者
    if (fileData.ownerId !== ownerId) {
      throw new Error('只有文件所有者可以移除协作者');
    }

    const collaborators = fileData.collaborators || [];
    const updatedCollaborators = collaborators.filter(c => c.userId !== userId);

    await updateDoc(fileRef, {
      collaborators: updatedCollaborators
    });

    return true;
  } catch (error) {
    console.error('移除协作者失败:', error);
    throw error;
  }
}

// 生成分享链接
export async function generateShareLink(fileId, ownerId, password = '', sharePermission = 'read') {
  try {
    const fileRef = doc(firestore, 'files', fileId);
    const fileSnap = await getDoc(fileRef);

    if (!fileSnap.exists()) {
      throw new Error('文件不存在');
    }

    const fileData = fileSnap.data();

    // 检查是否是文件所有者
    if (fileData.ownerId !== ownerId) {
      throw new Error('只有文件所有者可以生成分享链接');
    }

    // 验证权限级别
    const validPermissions = ['read', 'edit'];
    if (!validPermissions.includes(sharePermission)) {
      throw new Error('无效的分享权限级别');
    }

    // 生成分享码
    const shareCode = generateShareCode();
    const shareLink = `${window.location.origin}/canvas/${fileId}?share=${shareCode}`;

    await updateDoc(fileRef, {
      shareLink: shareCode,
      enablePassword: !!password,
      sharePassword: password,
      sharePermission: sharePermission
    });

    return shareLink;
  } catch (error) {
    console.error('生成分享链接失败:', error);
    throw error;
  }
}

// 通过分享链接加入协作
export async function joinByShareLink(fileId, shareCode, userId, password = '') {
  try {
    const fileRef = doc(firestore, 'files', fileId);
    const fileSnap = await getDoc(fileRef);

    if (!fileSnap.exists()) {
      throw new Error('文件不存在');
    }

    const fileData = fileSnap.data();

    // 验证分享码
    if (fileData.shareLink !== shareCode) {
      throw new Error('分享链接无效');
    }

    // 验证密码
    if (fileData.enablePassword && fileData.sharePassword !== password) {
      throw new Error('分享密码错误');
    }

    // 使用分享时设置的权限级别，如果没有设置则默认为读取权限
    const sharePermission = fileData.sharePermission || 'read';

    // 添加为协作者
    const collaborators = fileData.collaborators || [];
    const existingIndex = collaborators.findIndex(c => c.userId === userId);

    if (existingIndex === -1) {
      collaborators.push({ userId, permission: sharePermission });

      await updateDoc(fileRef, {
        collaborators
      });
    } else {
      // 如果已经是协作者，但权限级别较低，则升级权限
      const currentPermission = collaborators[existingIndex].permission;
      const permissions = ['none', 'read', 'edit'];
      const currentLevel = permissions.indexOf(currentPermission);
      const shareLevel = permissions.indexOf(sharePermission);

      if (shareLevel > currentLevel) {
        collaborators[existingIndex].permission = sharePermission;
        await updateDoc(fileRef, {
          collaborators
        });
      }
    }

    return { success: true, permission: sharePermission };
  } catch (error) {
    console.error('加入协作失败:', error);
    throw error;
  }
}

// 获取用户详细信息
export async function getUserDetails(userId) {
  try {
    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      return {
        uid: userId,
        nickname: userData.nickname || userData.displayName || `用户_${userId.slice(0, 6)}`,
        email: userData.email
      };
    } else {
      // 如果用户文档不存在，返回默认信息
      return {
        uid: userId,
        nickname: `用户_${userId.slice(0, 6)}`,
        email: null
      };
    }
  } catch (error) {
    console.error('获取用户详细信息失败:', error);
    return {
      uid: userId,
      nickname: `用户_${userId.slice(0, 6)}`,
      email: null
    };
  }
}

// 批量获取用户详细信息
export async function getUsersDetails(userIds) {
  try {
    const promises = userIds.map(userId => getUserDetails(userId));
    const results = await Promise.all(promises);
    return results;
  } catch (error) {
    console.error('批量获取用户详细信息失败:', error);
    return userIds.map(userId => ({
      uid: userId,
      nickname: `用户_${userId.slice(0, 6)}`,
      email: null
    }));
  }
}

// 获取在线协作者
export async function getOnlineCollaborators(fileId) {
  try {
    // 首先获取文件信息，包括所有者和协作者
    const fileRef = doc(firestore, 'files', fileId);
    const fileSnap = await getDoc(fileRef);

    if (!fileSnap.exists()) {
      return [];
    }

    const fileData = fileSnap.data();
    const allUsers = new Set();

    // 添加文件所有者
    allUsers.add(fileData.ownerId);

    // 添加所有协作者
    if (fileData.collaborators) {
      fileData.collaborators.forEach(collaborator => {
        allUsers.add(collaborator.userId);
      });
    }

    // 检查最近活动时间来判断在线状态
    const operationsRef = collection(firestore, 'collaborations');
    // 暂时简化查询，避免索引问题
    const q = query(
      operationsRef,
      where('fileId', '==', fileId),
      orderBy('timestamp', 'desc'),
      limit(50) // 限制查询数量
    );

    const snapshot = await getDocs(q);
    const recentActiveUsers = new Set();

    // 手动过滤5分钟内的活动
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
      if (timestamp > new Date(Date.now() - 300000)) { // 5分钟内有活动
        recentActiveUsers.add(data.userId);
      }
    });

    // 对于有权限但最近没有操作记录的用户，仍然算作在线（比如刚进入页面的用户）
    // 但主要以有操作记录的为准，同时确保当前用户总是显示为在线
    const onlineUsers = Array.from(recentActiveUsers);

    // 确保当前用户在在线列表中（如果他有权限访问文件）
    const auth = await import('./firebase').then(m => m.auth);
    const currentUser = auth.currentUser;
    if (currentUser && allUsers.has(currentUser.uid) && !onlineUsers.includes(currentUser.uid)) {
      onlineUsers.push(currentUser.uid);
    }

    return onlineUsers;
  } catch (error) {
    console.error('获取在线协作者失败:', error);
    return [];
  }
}

// 生成随机分享码
function generateShareCode() {
  return Math.random().toString(36).substr(2, 9);
}

// 清理过期的协作操作记录
export async function cleanupExpiredOperations(fileId, maxAgeHours = 1) {
  try {
    const operationsRef = collection(firestore, 'collaborations');
    const expiredTime = new Date(Date.now() - maxAgeHours * 3600000);

    const q = query(
      operationsRef,
      where('fileId', '==', fileId),
      where('timestamp', '<', expiredTime),
      limit(100) // 限制每次删除的数量，避免一次性删除过多
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return 0; // 没有过期记录
    }

    // 批量删除
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    const deletedCount = snapshot.docs.length;
    console.log(`已删除 ${deletedCount} 条过期协作记录 (文件: ${fileId})`);

    // 如果删除了100条记录，可能还有更多，递归继续清理
    if (deletedCount === 100) {
      const additionalDeleted = await cleanupExpiredOperations(fileId, maxAgeHours);
      return deletedCount + additionalDeleted;
    }

    return deletedCount;
  } catch (error) {
    console.error('清理过期协作记录失败:', error);
    throw error;
  }
}

// 全局清理所有过期的协作操作记录
export async function cleanupAllExpiredOperations(maxAgeHours = 2) {
  try {
    const operationsRef = collection(firestore, 'collaborations');
    const expiredTime = new Date(Date.now() - maxAgeHours * 3600000);

    const q = query(
      operationsRef,
      where('timestamp', '<', expiredTime),
      limit(500) // 每次最多清理500条记录
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('没有发现过期的协作记录');
      return 0;
    }

    // 批量删除
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    const deletedCount = snapshot.docs.length;
    console.log(`全局清理完成，已删除 ${deletedCount} 条过期协作记录`);

    // 如果删除了500条记录，可能还有更多，递归继续清理
    if (deletedCount === 500) {
      const additionalDeleted = await cleanupAllExpiredOperations(maxAgeHours);
      return deletedCount + additionalDeleted;
    }

    return deletedCount;
  } catch (error) {
    console.error('全局清理过期协作记录失败:', error);
    throw error;
  }
}

export default {
  OPERATION_TYPES,
  checkFileAccess,
  checkPermission,
  subscribeToFileChanges,
  subscribeToCollaborationOperations,
  broadcastOperation,
  updateFileContent,
  addCollaborator,
  removeCollaborator,
  generateShareLink,
  joinByShareLink,
  getOnlineCollaborators,
  getUserDetails,
  getUsersDetails,
  cleanupExpiredOperations,
  cleanupAllExpiredOperations
};