import React, { useEffect, useState } from 'react';
import { Button, Card, Dropdown, Menu, Input, Space, Radio, Row, Col, message, Modal, App, Spin, Select, Form } from 'antd';
import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  LinkOutlined,
  CopyOutlined,
  SwapOutlined,
} from '@ant-design/icons';

import * as userService from '../../services/userService';
import * as fileService from '../../services/fileService';
import { auth } from '../../services/firebase';
import { useNavigate } from 'react-router';
import { generateShareLink, getUserDetails } from '../../services/collaborationService';

const SORT_OPTIONS = [
  { label: '按最近打开时间排序', value: 'lastEditTime' },
];

export const Component = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [recentlyOpened, setRecentlyOpened] = useState([]);
  const [sortedRecentlyOpened, setSortedRecentlyOpened] = useState([]);
  const [sortBy, setSortBy] = useState('lastOpenTime');
  const [ascending, setAscending] = useState(false); // 默认按最近打开时间倒序
  const [search, setSearch] = useState('');
  const [renamingFile, setRenamingFile] = useState(null);
  const [newName, setNewName] = useState('');
  const [collaboratorNames, setCollaboratorNames] = useState({});
  const [isNamesLoaded, setIsNamesLoaded] = useState(false);
  const [loading, setLoading] = useState(true); // 添加loading状态

  // 转移所有权相关状态
  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [transferFile, setTransferFile] = useState(null);
  const [selectedNewOwner, setSelectedNewOwner] = useState(null);

  useEffect(() => {
    fetchRecentlyOpened();
  }, []);

  const fetchRecentlyOpened = async () => {
    try {
      setLoading(true); // 开始加载
      const uid = auth.currentUser?.uid;
      if (!uid) {
        message.error("用户未登录");
        return;
      }
      const recentFiles = await userService.getRecentFiles(uid);
      console.log("最近打开的文件:", recentFiles);
      if (!Array.isArray(recentFiles) || recentFiles.length === 0) {
        setRecentlyOpened([]);
        return;
      }
      const files = await Promise.all(
        recentFiles.map(async (fileId) => {
          const file = await fileService.getFileContent(fileId);
          return {
            ...file,
            id: fileId,
          };
        })
      );

      // 获取所有文件所有者和协作者的昵称
      const newNames = { ...collaboratorNames };
      const allUserIds = new Set();

      // 收集所有需要获取名称的用户ID
      files.forEach(file => {
        allUserIds.add(file.ownerId);
        if (file.collaborators) {
          file.collaborators.forEach(collaborator => {
            allUserIds.add(collaborator.userId);
          });
        }
      });

      // 批量获取用户信息
      const promises = Array.from(allUserIds).map(async (userId) => {
        if (!newNames[userId]) {
          try {
            const userDetails = await getUserDetails(userId);
            newNames[userId] = userDetails.nickname;
          } catch (error) {
            console.error('获取用户信息失败:', error);
            newNames[userId] = userId;
          }
        }
      });

      await Promise.all(promises);
      setCollaboratorNames(newNames);
      setRecentlyOpened(files);
    } catch (err) {
      console.error("❌ 加载最近打开文件失败:", err);
      message.error("加载最近打开文件失败");
    } finally {
      setLoading(false); // 结束加载
    }
  };

  useEffect(() => {
    setSortedRecentlyOpened([...recentlyOpened]
      .filter(file => file.fileName.includes(search))
      .sort((a, b) => {
        const valA = a[sortBy];
        const valB = b[sortBy];
        if (valA < valB) return ascending ? -1 : 1;
        if (valA > valB) return ascending ? 1 : -1;
        return 0;
      }));
    console.log('sortedRecentlyOpened:', sortedRecentlyOpened);
  }, [recentlyOpened, search, sortBy, ascending]);

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await fileService.renameFile(renamingFile.id, newName.trim());
      message.success("重命名成功");
      setRenamingFile(null);
      setNewName('');
      fetchRecentlyOpened();
    } catch (err) {
      console.error(err);
      message.error("重命名失败");
    }
  };

  const handleCopyLink = async (fileId) => {
    try {
      const link = await fileService.getFileShareLink(fileId);
      await navigator.clipboard.writeText(link);
      message.success("链接已复制");
    } catch (err) {
      console.error(err);
      message.error("复制失败");
    }
  };

  const handleCopyFile = async (fileId) => {
    try {
      await fileService.copyFile(fileId);
      message.success("已创建副本");
      fetchRecentlyOpened();
    } catch (err) {
      console.error(err);
      message.error("创建副本失败");
    }
  };

  const handleDelete = async (fileId) => {
    try {
      const uid = auth.currentUser?.uid;
      await userService.removeFromRecentFiles(uid, fileId);
      message.success("已从最近打开中移除");
      fetchRecentlyOpened();
    } catch (err) {
      console.error(err);
      message.error("操作失败");
    }
  };

  // 处理转移所有权
  const handleTransferOwnership = async (file) => {
    const currentUserId = auth.currentUser?.uid;
    if (file.ownerId !== currentUserId) {
      message.error("只有文件所有者可以转移所有权");
      return;
    }

    if (!file.collaborators || file.collaborators.length === 0) {
      message.warning("该文件暂无协作者，请先添加协作者后再转移所有权");
      return;
    }

    // 强制刷新协作者信息，确保显示最新的昵称
    const newNames = { ...collaboratorNames };
    const refreshPromises = file.collaborators.map(async (collaborator) => {
      try {
        const userDetails = await getUserDetails(collaborator.userId);
        newNames[collaborator.userId] = userDetails.nickname;
      } catch (error) {
        console.error('获取用户信息失败:', error);
        newNames[collaborator.userId] = collaborator.userId;
      }
    });

    await Promise.all(refreshPromises);
    setCollaboratorNames(newNames);

    setTransferFile(file);
    setSelectedNewOwner(null);
    setIsTransferModalVisible(true);
  };

  // 确认转移所有权
  const confirmTransferOwnership = async () => {
    if (!selectedNewOwner) {
      message.warning("请选择新的所有者");
      return;
    }

    try {
      const currentUserId = auth.currentUser?.uid;
      await fileService.transferOwnership(transferFile.id, currentUserId, selectedNewOwner);
      message.success("所有权转移成功！您已自动成为该文件的编辑协作者");
      setIsTransferModalVisible(false);
      setTransferFile(null);
      setSelectedNewOwner(null);
      fetchRecentlyOpened();
    } catch (error) {
      console.error("转移所有权失败:", error);
      message.error("转移所有权失败: " + error.message);
    }
  };

  const renderMenu = (file) => (
    <Menu>
      <Menu.Item icon={<EditOutlined />} onClick={() => {
        setRenamingFile(file);
        setNewName(file.fileName || '');
      }}>重命名</Menu.Item>
      <Menu.Item icon={<ShareAltOutlined />}>分享</Menu.Item>
      <Menu.Item icon={<LinkOutlined />} onClick={() => handleCopyLink(file.id)}>复制链接</Menu.Item>
      <Menu.Item icon={<CopyOutlined />} onClick={() => handleCopyFile(file.id)}>创建副本</Menu.Item>
      <Menu.Item icon={<SwapOutlined />} onClick={() => handleTransferOwnership(file)}>转移所有权</Menu.Item>
      <Menu.Item danger icon={<DeleteOutlined />} onClick={() => handleDelete(file.id)}>
        删除
      </Menu.Item>
    </Menu>
  );

  return (
    <div style={{ padding: '20px' }}>
      <h2>最近打开</h2>
      <Space style={{ marginBottom: 20 }}>
        <Radio.Group
          options={SORT_OPTIONS}
          onChange={(e) => setSortBy(e.target.value)}
          value={sortBy}
          optionType="button"
        />
        <Radio.Group
          value={ascending ? 'asc' : 'desc'}
          onChange={(e) => {
            setAscending(e.target.value === 'asc');
            console.log('ascending:', e.target.value === 'asc');
          }}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="asc">正序</Radio.Button>
          <Radio.Button value="desc">倒序</Radio.Button>
        </Radio.Group>
        <Input.Search
          placeholder="搜索文件名"
          onSearch={setSearch}
          allowClear
          style={{ width: 200 }}
        />
      </Space>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#666' }}>正在加载最近打开的文件...</div>
        </div>
      ) : (
        <Row gutter={[16, 16]}>
          {sortedRecentlyOpened.map((file) => (
            <Col key={file.id} span={6}>
              <Card
                title={
                  <span>
                    {file.fileName || '未命名'}
                    <EditOutlined style={{ marginLeft: 8 }} onClick={() => {
                      setRenamingFile(file);
                      setNewName(file.fileName || '');
                    }} />
                  </span>
                }
                extra={<Dropdown overlay={renderMenu(file)}><MoreOutlined /></Dropdown>}
                actions={[
                  <Button size="small" danger onClick={() => handleDelete(file.id)}>删除</Button>,
                  <Button size="small" type="primary" onClick={() => navigate(`/canvas/${file.id}`)}> 打开</Button>
                ]}
              >
                <p>最近打开时间：{file.lastEditTime?.toDate?.().toLocaleString?.() || '—'}</p>
                <p>创建时间：{file.createTime?.toDate?.().toLocaleString?.() || '—'}</p>
                <p>修改时间：{file.lastEditTime?.toDate?.().toLocaleString?.() || '—'}</p>
                <p>文件归属：{collaboratorNames[file.ownerId] || '未知'}</p>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {!loading && sortedRecentlyOpened.length === 0 && (
        <p style={{ color: '#999', textAlign: 'center', padding: '50px 0' }}>暂无最近打开的文件</p>
      )}

      <Modal
        title="重命名文件"
        open={!!renamingFile}
        onCancel={() => setRenamingFile(null)}
        onOk={handleRename}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="请输入新文件名"
        />
      </Modal>

      {/* 转移所有权弹窗 */}
      <Modal
        title="转移所有权"
        open={isTransferModalVisible}
        onCancel={() => {
          setIsTransferModalVisible(false);
          setTransferFile(null);
          setSelectedNewOwner(null);
        }}
        onOk={confirmTransferOwnership}
        okText="确认转移"
        cancelText="取消"
        okButtonProps={{
          danger: true,
          disabled: !selectedNewOwner
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>文件名：</strong>{transferFile?.fileName}</p>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            <p style={{ color: '#ff4d4f' }}>
              ⚠️ 警告：转移所有权后，您将失去对此文件的完全控制权，新所有者将拥有文件的所有权限。
            </p>
            <p style={{ color: '#52c41a' }}>
              您将自动保留该文件的编辑权限，可以继续编辑文件内容。
            </p>
          </div>
        </div>

        <Form layout="vertical">
          <Form.Item
            label="选择新所有者"
            required
          >
            <Select
              placeholder="请选择协作者作为新所有者"
              value={selectedNewOwner}
              onChange={setSelectedNewOwner}
              style={{ width: '100%' }}
            >
              {transferFile?.collaborators?.map(collaborator => (
                <Select.Option key={collaborator.userId} value={collaborator.userId}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{collaboratorNames[collaborator.userId] || collaborator.userId}</span>
                    <span style={{ color: '#666', fontSize: '12px' }}>
                      ({collaborator.permission === 'edit' ? '编辑权限' : '只读权限'})
                    </span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};