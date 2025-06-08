import React, { useState } from 'react';
import { App } from 'antd';
import { auth } from '../../services/firebase';
import { generateShareLink } from '../../services/collaborationService';
import styles from './SharePanel.module.css';

export const SharePanel = ({
  fileId,
  ownerId,
  onClose,
  dragRef,
  onMouseDown
}) => {
  const { message } = App.useApp();
  const [shareLink, setShareLink] = useState('');
  const [sharePassword, setSharePassword] = useState('');
  const [sharePermission, setSharePermission] = useState('read');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const currentUser = auth.currentUser;
  const isOwner = currentUser?.uid === ownerId;

  // 生成分享链接
  const handleGenerateShareLink = async () => {
    setIsGeneratingLink(true);
    try {
      const link = await generateShareLink(fileId, currentUser.uid, sharePassword, sharePermission);
      setShareLink(link);
      // 复制到剪贴板
      navigator.clipboard.writeText(link);
      message.success(`分享链接已生成并复制到剪贴板！权限级别: ${getPermissionText(sharePermission)}`);
    } catch (error) {
      message.error('生成分享链接失败: ' + error.message);
    } finally {
      setIsGeneratingLink(false);
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

  return (
    <div className={styles.sharePanel} onMouseDown={onMouseDown}>
      <div ref={dragRef} className={styles.header}>
        <h3>分享画布</h3>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>

      <div className={styles.content}>
        {isOwner ? (
          <div className={styles.section}>
            <div className={styles.shareForm}>
              <div className={styles.shareOptions}>
                <div className={styles.permissionSelect}>
                  <label>分享权限:</label>
                  <select
                    value={sharePermission}
                    onChange={(e) => setSharePermission(e.target.value)}
                    className={styles.permissionDropdown}
                  >
                    <option value="read">只读权限</option>
                    <option value="edit">编辑权限</option>
                  </select>
                </div>
                <div className={styles.passwordInput}>
                  <input
                    type="password"
                    placeholder="设置分享密码（可选）"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={handleGenerateShareLink}
                disabled={isGeneratingLink}
                className={styles.generateButton}
              >
                {isGeneratingLink ? '生成中...' : '生成分享链接'}
              </button>

              {shareLink && (
                <div className={styles.shareResult}>
                  <p>分享链接已生成并复制到剪贴板:</p>
                  <div className={styles.shareLink}>
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className={styles.shareLinkInput}
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(shareLink)}
                      className={styles.copyButton}
                    >
                      复制
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.section}>
            <p className={styles.noPermissionText}>只有文件所有者可以生成分享链接</p>
          </div>
        )}
      </div>
    </div>
  );
};