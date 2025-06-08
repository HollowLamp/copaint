import React, { useState, useEffect } from 'react';
import { App } from 'antd';
import { auth } from '../../services/firebase';
import {
  addCollaborator,
  removeCollaborator,
  getOnlineCollaborators,
  getUsersDetails,
  getUserDetails,
  checkPermission
} from '../../services/collaborationService';
import styles from './CollaborationPanel.module.css';

export const CollaborationPanel = ({
  fileId,
  collaborators = [],
  ownerId,
  onClose,
  dragRef,
  onMouseDown
}) => {
  const { message } = App.useApp();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineUsersDetails, setOnlineUsersDetails] = useState([]);
  const [ownerDetails, setOwnerDetails] = useState(null);
  const [collaboratorsDetails, setCollaboratorsDetails] = useState([]);
  const [newCollaboratorId, setNewCollaboratorId] = useState('');

  const currentUser = auth.currentUser;
  const isOwner = currentUser?.uid === ownerId;

  // 获取在线协作者和用户详细信息
  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const online = await getOnlineCollaborators(fileId);
        setOnlineUsers(online);

        // 获取在线用户的详细信息
        if (online.length > 0) {
          const details = await getUsersDetails(online);
          setOnlineUsersDetails(details);
        } else {
          setOnlineUsersDetails([]);
        }
      } catch (error) {
        console.error('获取在线用户失败:', error);
      }
    };

    fetchOnlineUsers();

    // 每30秒更新一次在线状态
    const interval = setInterval(fetchOnlineUsers, 30000);
    return () => clearInterval(interval);
  }, [fileId]);

  // 获取所有者详细信息
  useEffect(() => {
    const fetchOwnerDetails = async () => {
      if (ownerId) {
        try {
          const details = await getUserDetails(ownerId);
          setOwnerDetails(details);
        } catch (error) {
          console.error('获取所有者信息失败:', error);
        }
      }
    };

    fetchOwnerDetails();
  }, [ownerId]);

  // 获取协作者详细信息
  useEffect(() => {
    const fetchCollaboratorsDetails = async () => {
      if (collaborators.length > 0) {
        try {
          const userIds = collaborators.map(c => c.userId);
          const details = await getUsersDetails(userIds);
          // 合并权限信息
          const detailsWithPermissions = details.map(detail => {
            const collaborator = collaborators.find(c => c.userId === detail.uid);
            return {
              ...detail,
              permission: collaborator?.permission || 'read'
            };
          });
          setCollaboratorsDetails(detailsWithPermissions);
        } catch (error) {
          console.error('获取协作者信息失败:', error);
        }
      } else {
        setCollaboratorsDetails([]);
      }
    };

    fetchCollaboratorsDetails();
  }, [collaborators]);

  // 添加协作者
  const handleAddCollaborator = async (permission = 'read') => {
    if (!newCollaboratorId.trim()) return;

    try {
      await addCollaborator(fileId, currentUser.uid, newCollaboratorId.trim(), permission);
      setNewCollaboratorId('');
      message.success('协作者添加成功！');
    } catch (error) {
      message.error('添加协作者失败: ' + error.message);
    }
  };

  // 移除协作者
  const handleRemoveCollaborator = async (userId) => {
    if (!confirm('确定要移除此协作者吗？')) return;

    try {
      await removeCollaborator(fileId, currentUser.uid, userId);
      message.success('协作者移除成功！');
    } catch (error) {
      message.error('移除协作者失败: ' + error.message);
    }
  };



  // 获取权限文本
  const getPermissionText = (permission) => {
    const permissionMap = {
      'none': '无权限',
      'read': '只读',
      'edit': '编辑'
    };
    return permissionMap[permission] || '未知';
  };

  // 获取在线状态
  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  return (
    <div className={styles.collaborationPanel} onMouseDown={onMouseDown}>
      <div ref={dragRef} className={styles.header}>
        <h3>协作管理</h3>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>

      <div className={styles.content}>
        {/* 在线用户状态 */}
        <div className={styles.section}>
          <h4>当前在线 ({onlineUsersDetails.length})</h4>
          <div className={styles.onlineUsers}>
            {onlineUsersDetails.map(user => (
              <div key={user.uid} className={styles.onlineUser}>
                <div className={styles.userAvatar}>
                  {user.nickname.charAt(0).toUpperCase()}
                </div>
                <span className={styles.userId}>{user.nickname}</span>
                <div className={styles.onlineIndicator}></div>
              </div>
            ))}
            {onlineUsersDetails.length === 0 && (
              <p className={styles.emptyText}>暂无在线用户</p>
            )}
          </div>
        </div>

        {/* 协作者列表 */}
        <div className={styles.section}>
          <h4>协作者 ({collaboratorsDetails.length})</h4>
          <div className={styles.collaboratorsList}>
            {/* 文件所有者 */}
            {ownerDetails && (
              <div className={styles.collaborator}>
                <div className={styles.userInfo}>
                  <div className={styles.userAvatar}>
                    {ownerDetails.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.userDetails}>
                    <span className={styles.userId}>{ownerDetails.nickname}</span>
                    <span className={styles.userRole}>所有者</span>
                  </div>
                </div>
                <div className={styles.userStatus}>
                  {isUserOnline(ownerId) && <div className={styles.onlineIndicator}></div>}
                </div>
              </div>
            )}

            {/* 协作者 */}
            {collaboratorsDetails.map(collaborator => (
              <div key={collaborator.uid} className={styles.collaborator}>
                <div className={styles.userInfo}>
                  <div className={styles.userAvatar}>
                    {collaborator.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.userDetails}>
                    <span className={styles.userId}>{collaborator.nickname}</span>
                    <span className={styles.permission}>
                      {getPermissionText(collaborator.permission)}
                    </span>
                  </div>
                </div>
                <div className={styles.userActions}>
                  {isUserOnline(collaborator.uid) && (
                    <div className={styles.onlineIndicator}></div>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveCollaborator(collaborator.uid)}
                      className={styles.removeButton}
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 添加协作者 (仅所有者可见) */}
        {isOwner && (
          <div className={styles.section}>
            <h4>添加协作者</h4>
            <div className={styles.addCollaborator}>
              <input
                type="text"
                placeholder="输入用户ID"
                value={newCollaboratorId}
                onChange={(e) => setNewCollaboratorId(e.target.value)}
                className={styles.userIdInput}
              />
              <div className={styles.permissionButtons}>
                <button
                  onClick={() => handleAddCollaborator('read')}
                  className={styles.addButton}
                >
                  添加为只读
                </button>
                <button
                  onClick={() => handleAddCollaborator('edit')}
                  className={styles.addButton}
                >
                  添加为编辑
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};