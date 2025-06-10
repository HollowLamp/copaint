import { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '../services/firebase';
import {
  subscribeToFileChanges,
  subscribeToCollaborationOperations,
  broadcastOperation,
  updateFileContent,
  checkPermission,
  checkFileAccess,
  getOnlineCollaborators,
  OPERATION_TYPES
} from '../services/collaborationService';
import { App } from 'antd';

export const useCollaboration = ({ fileId, onContentUpdate, onCollaboratorsUpdate }) => {
  const { message } = App.useApp();
  const [collaborators, setCollaborators] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [isReceivingUpdate, setIsReceivingUpdate] = useState(false);

  const unsubscribeFileRef = useRef(null);
  const unsubscribeOperationsRef = useRef(null);
  const lastBroadcastRef = useRef(null);
  const currentUser = auth.currentUser;

  // 检查基础访问权限
  const checkUserAccess = useCallback(() => {
    if (!currentUser) return false;
    return checkFileAccess(collaborators, ownerId, currentUser.uid);
  }, [collaborators, ownerId, currentUser]);

  // 检查特定权限
  const checkUserPermission = useCallback((permission) => {
    if (!currentUser) return false;
    if (ownerId === currentUser.uid) return true;
    return checkPermission(collaborators, currentUser.uid, permission);
  }, [collaborators, ownerId, currentUser]);

  // 更新权限状态
  useEffect(() => {
    setHasEditPermission(checkUserPermission('edit'));
  }, [checkUserPermission]);

  // 存储回调函数的引用
  const onContentUpdateRef = useRef(onContentUpdate);
  const onCollaboratorsUpdateRef = useRef(onCollaboratorsUpdate);

  // 更新回调函数引用
  useEffect(() => {
    onContentUpdateRef.current = onContentUpdate;
    onCollaboratorsUpdateRef.current = onCollaboratorsUpdate;
  }, [onContentUpdate, onCollaboratorsUpdate]);

  // 监听文件变化
  useEffect(() => {
    if (!fileId) return;

    console.log('设置文件监听器:', fileId);

    const unsubscribe = subscribeToFileChanges(fileId, (fileData) => {
      console.log('收到文件更新:', fileData);

      setCollaborators(fileData.collaborators || []);
      setOwnerId(fileData.ownerId);

      // 通知父组件协作者更新
      if (onCollaboratorsUpdateRef.current) {
        onCollaboratorsUpdateRef.current(fileData.collaborators || []);
      }

      // 处理内容更新，使用最新的回调函数引用
      if (onContentUpdateRef.current && fileData.content) {
        console.log('准备应用远程内容更新', { hasContent: !!fileData.content.json });

        // 立即调用内容更新，不检查isReceivingUpdate状态（因为这是远程更新）
        setIsReceivingUpdate(true);
        onContentUpdateRef.current(fileData.content);

        // 延长标记时间，确保不会立即触发保存
        setTimeout(() => {
          setIsReceivingUpdate(false);
          console.log('远程内容更新完成，恢复保存功能');
        }, 800);
      }
    });

    unsubscribeFileRef.current = unsubscribe;

    return () => {
      console.log('清理文件监听器');
      if (unsubscribe) unsubscribe();
    };
  }, [fileId]); // 只依赖fileId

  // 监听协作操作
  useEffect(() => {
    if (!fileId || !currentUser) return;

    console.log('设置操作监听器:', fileId, currentUser.uid);

    const unsubscribe = subscribeToCollaborationOperations(fileId, (operation) => {
      // 忽略自己的操作
      if (operation.userId === currentUser.uid) {
        console.log('忽略自己的操作:', operation);
        return;
      }

      // 忽略重复的广播
      if (lastBroadcastRef.current === operation.id) {
        console.log('忽略重复操作:', operation.id);
        return;
      }

      lastBroadcastRef.current = operation.id;
      console.log('处理协作操作:', operation);

      switch (operation.operationType) {
        case OPERATION_TYPES.CANVAS_UPDATE:
          // 通过文件监听器来处理内容更新，这里不直接处理避免重复
          console.log('画布更新操作（通过文件监听器处理）');
          break;
        case OPERATION_TYPES.USER_JOIN:
          console.log('用户加入:', operation.userId);
          break;
        case OPERATION_TYPES.USER_LEAVE:
          console.log('用户离开:', operation.userId);
          break;
        default:
          console.log('未处理的操作类型:', operation.operationType);
      }
    });

    unsubscribeOperationsRef.current = unsubscribe;

    return () => {
      console.log('清理操作监听器');
      if (unsubscribe) unsubscribe();
    };
  }, [fileId, currentUser]); // 移除onContentUpdate依赖

  // 广播画布更新
  const broadcastCanvasUpdate = useCallback(async (content) => {
    if (!fileId || !currentUser || isReceivingUpdate) {
      console.log('跳过广播:', { fileId: !!fileId, currentUser: !!currentUser, isReceivingUpdate });
      return;
    }

    console.log('开始广播画布更新');

    try {
      // 设置接收更新标记，防止在更新期间触发回调
      setIsReceivingUpdate(true);

      await updateFileContent(fileId, currentUser.uid, content);
      console.log('画布更新已广播到服务器');

      // 延迟恢复，确保所有监听器都处理完更新，从1.5秒增加到2.5秒
      setTimeout(() => {
        setIsReceivingUpdate(false);
        console.log('广播完成，恢复监听状态');
      }, 2500); // 增加延迟时间，减少重复更新

    } catch (error) {
      console.error('广播画布更新失败:', error);
      setIsReceivingUpdate(false); // 失败时立即恢复
      if (error.message.includes('无编辑权限')) {
        message.error('您没有编辑权限');
      }
    }
  }, [fileId, currentUser, isReceivingUpdate]);

  // 广播用户操作
  const broadcastUserOperation = useCallback(async (operationType, data) => {
    if (!fileId || !currentUser) return;

    try {
      await broadcastOperation(fileId, currentUser.uid, operationType, data);
    } catch (error) {
      console.error('广播用户操作失败:', error);
    }
  }, [fileId, currentUser]);

  // 广播用户加入
  const broadcastUserJoin = useCallback(() => {
    broadcastUserOperation(OPERATION_TYPES.USER_JOIN, {
      timestamp: new Date().toISOString()
    });
  }, [broadcastUserOperation]);

  // 广播用户离开
  const broadcastUserLeave = useCallback(() => {
    broadcastUserOperation(OPERATION_TYPES.USER_LEAVE, {
      timestamp: new Date().toISOString()
    });
  }, [broadcastUserOperation]);

  // 组件挂载时广播用户加入
  useEffect(() => {
    if (fileId && currentUser) {
      broadcastUserJoin();
    }

    // 组件卸载时广播用户离开
    return () => {
      if (fileId && currentUser) {
        broadcastUserLeave();
      }
    };
  }, [fileId, currentUser, broadcastUserJoin, broadcastUserLeave]);

  // 处理网络状态
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 定期更新在线用户列表
  useEffect(() => {
    if (!fileId) return;

    const updateOnlineUsers = async () => {
      try {
        const online = await getOnlineCollaborators(fileId);
        setOnlineUsers(online);
        console.log('在线用户更新:', online);
      } catch (error) {
        console.error('获取在线用户失败:', error);
      }
    };

    // 立即更新一次
    updateOnlineUsers();

    // 每60秒更新一次在线用户列表，从30秒增加到60秒减少查询频率
    const interval = setInterval(updateOnlineUsers, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [fileId]);

  // 监听用户加入/离开操作，及时更新在线状态
  // 注释掉这个过于频繁的更新逻辑，减少数据库查询
  // useEffect(() => {
  //   if (!fileId) return;

  //   const updateOnlineUsersDebounced = () => {
  //     // 延迟更新，等待操作记录写入数据库
  //     setTimeout(async () => {
  //       try {
  //         const online = await getOnlineCollaborators(fileId);
  //         setOnlineUsers(online);
  //         console.log('用户活动后更新在线用户:', online);
  //       } catch (error) {
  //         console.error('更新在线用户失败:', error);
  //       }
  //     }, 1000);
  //   };

  //   // 监听自己的活动也更新在线状态
  //   const activityTimer = setTimeout(updateOnlineUsersDebounced, 2000);

  //   return () => {
  //     clearTimeout(activityTimer);
  //   };
  // }, [fileId, collaborators]); // 当协作者变化时也触发更新

  // 清理函数
  const cleanup = useCallback(() => {
    if (unsubscribeFileRef.current) {
      unsubscribeFileRef.current();
      unsubscribeFileRef.current = null;
    }
    if (unsubscribeOperationsRef.current) {
      unsubscribeOperationsRef.current();
      unsubscribeOperationsRef.current = null;
    }
  }, []);

  return {
    // 状态
    collaborators,
    ownerId,
    isOnline,
    onlineUsers,
    hasEditPermission,
    hasAccess: checkUserAccess(),
    isReceivingUpdate,
    currentUser,

    // 方法
    broadcastCanvasUpdate,
    broadcastUserOperation,
    checkUserPermission,
    checkUserAccess,
    cleanup,

    // 操作类型常量
    OPERATION_TYPES
  };
};