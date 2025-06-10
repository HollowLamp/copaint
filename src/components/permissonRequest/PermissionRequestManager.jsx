import React, { useState, useEffect } from 'react';
import { App, Button, Card, Badge, Modal } from 'antd';
import { getFileOwnerPermissionRequests, handlePermissionRequest } from '../../services/collaborationService';
import styles from './PermissionRequestManager.module.css';

export const PermissionRequestManager = ({ userId, onClose }) => {
  const { message } = App.useApp();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // 获取权限申请
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const requestList = await getFileOwnerPermissionRequests(userId);
      setRequests(requestList);
    } catch (error) {
      console.error('获取权限申请失败:', error);
      message.error('获取权限申请失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchRequests();
    }
  }, [userId]);

  // 处理申请
  const handleRequest = async (requestId, action, fileId, requesterId, permission) => {
    try {
      await handlePermissionRequest(requestId, action, userId, fileId, requesterId, permission);
      message.success(action === 'approve' ? '已批准申请' : '已拒绝申请');
      fetchRequests(); // 刷新列表
    } catch (error) {
      message.error('处理申请失败: ' + error.message);
    }
  };

  const getPermissionText = (permission) => {
    const map = {
      'read': '只读权限',
      'edit': '编辑权限'
    };
    return map[permission] || permission;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '未知时间';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className={styles.requestManager}>
        <div className={styles.header}>
          <h3>权限申请管理</h3>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        <div className={styles.content}>
          <p style={{ textAlign: 'center', padding: '20px' }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.requestManager}>
      <div className={styles.header}>
        <h3>权限申请管理</h3>
        <Badge count={requests.length} style={{ marginLeft: '8px' }} />
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>

      <div className={styles.content}>
        {requests.length === 0 ? (
          <p className={styles.emptyText}>暂无待处理的权限申请</p>
        ) : (
          <div className={styles.requestsList}>
            {requests.map(request => (
              <Card
                key={request.id}
                className={styles.requestCard}
                size="small"
              >
                <div className={styles.requestInfo}>
                  <div className={styles.requestHeader}>
                    <strong>{request.requesterDetails.nickname}</strong>
                    <span className={styles.requestTime}>
                      {formatTime(request.timestamp)}
                    </span>
                  </div>

                  <div className={styles.requestDetails}>
                    <p><strong>文件:</strong> {request.fileName}</p>
                    <p><strong>申请权限:</strong> {getPermissionText(request.requestedPermission)}</p>
                    {request.message && (
                      <p><strong>申请理由:</strong> {request.message}</p>
                    )}
                  </div>
                </div>

                <div className={styles.requestActions}>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => handleRequest(
                      request.id,
                      'approve',
                      request.fileId,
                      request.requesterId,
                      request.requestedPermission
                    )}
                    className={styles.approveButton}
                  >
                    批准
                  </Button>
                  <Button
                    danger
                    size="small"
                    onClick={() => handleRequest(request.id, 'reject', null, null, null)}
                    className={styles.rejectButton}
                  >
                    拒绝
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};