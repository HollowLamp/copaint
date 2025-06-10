import React, { useState } from 'react';
import { App, Input, Select, Button } from 'antd';
import { requestPermission } from '../../services/collaborationService';
import styles from './PermissionRequestPanel.module.css';

export const PermissionRequestPanel = ({
  fileId,
  userId,
  currentPermission = 'none',
  fileName = '未知文件',
  onClose,
  onRequestSent
}) => {
  const { message } = App.useApp();
  const [requestMessage, setRequestMessage] = useState('');
  const [requestedPermission, setRequestedPermission] = useState('read');
  const [loading, setLoading] = useState(false);

  // 根据当前权限确定可申请的权限
  const getAvailablePermissions = () => {
    if (currentPermission === 'none') {
      return [
        { value: 'read', label: '只读权限' },
        { value: 'edit', label: '编辑权限' }
      ];
    } else if (currentPermission === 'read') {
      return [
        { value: 'edit', label: '编辑权限' }
      ];
    }
    return [];
  };

  const handleSubmitRequest = async () => {
    if (!requestMessage.trim()) {
      message.warning('请填写申请理由');
      return;
    }

    setLoading(true);
    try {
      await requestPermission(fileId, userId, requestedPermission, requestMessage);
      message.success('权限申请已发送，请等待文件所有者审核');
      onRequestSent && onRequestSent();
      onClose && onClose();
    } catch (error) {
      message.error('发送申请失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const availablePermissions = getAvailablePermissions();

  if (availablePermissions.length === 0) {
    return (
      <div className={styles.permissionRequestPanel}>
        <div className={styles.header}>
          <h3>权限申请</h3>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        <div className={styles.content}>
          <p className={styles.noPermissionText}>您已拥有此文件的最高权限</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.permissionRequestPanel}>
      <div className={styles.header}>
        <h3>申请文件权限</h3>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>

      <div className={styles.content}>
        <div className={styles.fileInfo}>
          <h4>文件: {fileName}</h4>
          <p className={styles.currentPermission}>
            当前权限: {currentPermission === 'none' ? '无权限' : currentPermission === 'read' ? '只读' : '编辑'}
          </p>
        </div>

        <div className={styles.formSection}>
          <label>申请权限:</label>
          <Select
            value={requestedPermission}
            onChange={setRequestedPermission}
            className={styles.permissionSelect}
            style={{ width: '100%' }}
          >
            {availablePermissions.map(perm => (
              <Select.Option key={perm.value} value={perm.value}>
                {perm.label}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div className={styles.formSection}>
          <label>申请理由:</label>
          <Input.TextArea
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            placeholder="请说明申请权限的理由..."
            rows={4}
            className={styles.messageInput}
          />
        </div>

        <div className={styles.actions}>
          <Button onClick={onClose} className={styles.cancelButton}>
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleSubmitRequest}
            loading={loading}
            className={styles.submitButton}
          >
            发送申请
          </Button>
        </div>
      </div>
    </div>
  );
};