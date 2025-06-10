import React, { useEffect, useState } from 'react';
import { Button, Card, Dropdown, Menu, Input, Space, Radio, Row, Col, message, Modal, App, Form, Select } from 'antd';
import {
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  LinkOutlined,
  CopyOutlined,
  SwapOutlined,
  PlusOutlined,
} from '@ant-design/icons';

import * as userService from '../../services/userService';
import * as fileService from '../../services/fileService';
import { auth } from '../../services/firebase';
import { useNavigate } from 'react-router';
import { generateShareLink, getUserDetails } from '../../services/collaborationService';

// 排序选项
const SORT_OPTIONS = [
  { label: '按创建时间排序', value: 'createTime' },
  { label: '按修改时间排序', value: 'lastEditTime' },
  { label: '按首字母排序', value: 'name' },
];

// 组件
export const Component = () => {
  const { message } = App.useApp(); // 从 App.useApp() 获取 message 方法，用于显示全局消息提示
  const navigate = useNavigate(); // 获取路由导航方法，用于页面跳转
  const [manuscripts, setManuscripts] = useState([]); // 存储手稿列表数据，manuscripts: 数组，包含所有手稿信息，setManuscripts: 更新手稿列表的函数
  const [favorites, setFavorites] = useState([]); // 添加收藏列表状态
  const [sortBy, setSortBy] = useState('createTime'); // 控制排序方式，sortBy: 字符串，可选值，setSortBy: 更新排序方式的函数
  const [ascending, setAscending] = useState(true); // 控制排序方向，ascending: 布尔值，true 表示升序，false 表示降序，setAscending: 更新排序方向的函数
  const [search, setSearch] = useState(''); // 控制搜索关键词，search: 字符串，用户输入的搜索内容，setSearch: 更新搜索关键词的函数
  const [renamingFile, setRenamingFile] = useState(null); // 控制重命名状态，renamingFile: 对象，当前正在重命名的文件信息，null 表示没有文件在重命名，setRenamingFile: 更新重命名状态的函数
  const [newName, setNewName] = useState(''); // 控制新文件名，newName: 字符串，重命名时输入的新文件名，setNewName: 更新新文件名的函数
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false); // 添加创建弹窗状态
  const [newFileName, setNewFileName] = useState(''); // 添加新文件名状态
  const [isShareModalVisible, setIsShareModalVisible] = useState(false); // 添加分享弹窗状态
  const [selectedFile, setSelectedFile] = useState(null); // 添加选中的文件状态
  const [shareForm] = Form.useForm(); // 添加表单实例
  const [collaboratorNames, setCollaboratorNames] = useState({});

  // 获取手稿和收藏列表
  useEffect(() => {
    fetchManuscripts();
    fetchFavorites();
  }, []);

  // 获取收藏列表
  const fetchFavorites = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        message.error("用户未登录");
        return;
      }
      const favs = await userService.getFavorites(uid);
      setFavorites(favs);
    } catch (err) {
      console.error("❌ 加载收藏列表失败:", err);
      message.error("加载收藏列表失败");
    }
  };

  // 检查文件是否已收藏
  const isFavorited = (fileId) => {
    return favorites.includes(fileId);
  };

  // 获取手稿
  const fetchManuscripts = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        message.error("用户未登录");
        return;
      }
      const files = await fileService.getMyFiles(uid);
      
      // 获取所有协作者的昵称
      const allCollaborators = files.flatMap(file => file.collaborators || []);
      const newNames = { ...collaboratorNames };
      const promises = allCollaborators.map(async (collab) => {
        if (!collaboratorNames[collab.userId]) {
          try {
            const userDetails = await getUserDetails(collab.userId);
            newNames[collab.userId] = userDetails.nickname;
          } catch (error) {
            console.error('获取用户信息失败:', error);
            newNames[collab.userId] = collab.userId;
          }
        }
      });

      await Promise.all(promises);
      setCollaboratorNames(newNames);
      setManuscripts(files);
    } catch (err) {
      console.error("❌ 加载我的手稿失败:", err);
      message.error("加载我的手稿失败");
    }
  };

  // 排序
  const sortedManuscripts = [...manuscripts]
    .filter(file => file.fileName.includes(search))
    .sort((a, b) => {
      let valA, valB;
      if (sortBy === 'name') {
        valA = a.fileName || '';
        valB = b.fileName || '';
      } else {
        valA = a[sortBy];
        valB = b[sortBy];
      }
      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    });

  // 添加收藏
  const handleFavorite = async (fileId) => {
    try {
      const uid = auth.currentUser?.uid;
      await userService.addFavorite(uid, fileId);
      message.success("已添加到收藏");
      await Promise.all([fetchManuscripts(), fetchFavorites()]); // 同时更新两个列表
    } catch (err) {
      console.error(err);
      message.error("添加收藏失败");
    }
  };

  // 取消收藏
  const handleUnfavorite = async (fileId) => {
    try {
      const uid = auth.currentUser?.uid;
      await userService.removeFavorite(uid, fileId);
      message.success("已取消收藏");
      await Promise.all([fetchManuscripts(), fetchFavorites()]); // 同时更新两个列表
    } catch (err) {
      console.error(err);
      message.error("操作失败");
    }
  };

  // 重命名
  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await fileService.renameFile(renamingFile.id, newName.trim());
      message.success("重命名成功");
      setRenamingFile(null);
      setNewName('');
      fetchManuscripts();
    } catch (err) {
      console.error(err);
      message.error("重命名失败");
    }
  };

  // 处理复制链接
  const handleCopyLink = async (fileId, permission, password) => {
    try {
      const link = await generateShareLink(fileId, auth.currentUser.uid, password, permission);
      await navigator.clipboard.writeText(link);
      message.success("链接已复制到剪贴板");
    } catch (err) {
      console.error(err);
      message.error("复制链接失败");
    }
  };

  // 创建副本
  const handleCopyFile = async (fileId) => {
    try {
      await fileService.copyFile(fileId);
      message.success("已创建副本");
      fetchManuscripts();
    } catch (err) {
      console.error(err);
      message.error("创建副本失败");
    }
  };

  // 创建新手稿
  const handleCreateFile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        message.error("用户未登录");
        return;
      }
      if (!newFileName.trim()) {
        message.error("请输入文件名");
        return;
      }
      const file = await fileService.createFile({
        fileName: newFileName.trim(),
        ownerId: user.uid
      });
      message.success("创建成功");
      setIsCreateModalVisible(false); // 关闭弹窗
      setNewFileName(''); // 清空输入
      fetchManuscripts();
    } catch (err) {
      console.error("创建文件失败:", err);
      message.error("创建文件失败");
    }
  };

  // 回收文件
  const handleRecycle = async (fileId) => {
    try {
      await fileService.recycleFile(fileId);
      message.success("已放入回收站");
      fetchManuscripts();
    } catch (err) {
      console.error(err);
      message.error("回收失败");
    }
  };

  // 处理分享
  const handleShare = (file) => {
    setSelectedFile(file);
    setIsShareModalVisible(true);
  };

  // 渲染菜单
  const renderMenu = (file) => (
    <Menu>
      <Menu.Item icon={<EditOutlined />} onClick={() => {
        setRenamingFile(file);
        setNewName(file.fileName || '');
      }}>重命名</Menu.Item>
      <Menu.Item icon={<ShareAltOutlined />} onClick={() => handleShare(file)}>分享</Menu.Item>
      <Menu.Item icon={<CopyOutlined />} onClick={() => handleCopyFile(file.id)}>创建副本</Menu.Item>
      <Menu.Item icon={<SwapOutlined />}>转移所有权</Menu.Item>
      <Menu.Item danger icon={<DeleteOutlined />} onClick={() => handleRecycle(file.id)}>
        删除
      </Menu.Item>
    </Menu>
  );

  // 渲染页面
  return (
    <div style={{ padding: '20px' }}>
      <h2>我的手稿</h2>
      <Space style={{ marginBottom: 20 }}>
        <Radio.Group
          options={SORT_OPTIONS}
          onChange={(e) => setSortBy(e.target.value)}
          value={sortBy}
          optionType="button"
        />
        <Radio.Group
          value={ascending ? 'asc' : 'desc'}
          onChange={(e) => setAscending(e.target.value === 'asc')}
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

      <Row gutter={[16, 16]}>
        {/* 创建新手稿卡片 */}
        <Col span={6}>
          <Card
            hoverable
            onClick={() => setIsCreateModalVisible(true)}
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: 'var(--accent-primary)'
            }}>
              <PlusOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <span>创建新手稿</span>
            </div>
          </Card>
        </Col>

        {/* 现有的手稿列表 */}
        {sortedManuscripts.map((file) => (
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
                <Button 
                  size="small" 
                  type={isFavorited(file.id) ? "default" : "default"}
                  danger={isFavorited(file.id)}
                  onClick={() => isFavorited(file.id) ? handleUnfavorite(file.id) : handleFavorite(file.id)}
                >
                  {isFavorited(file.id) ? "已收藏" : "收藏"}
                </Button>,
                <Button
                  size="small"
                  type="primary"
                  onClick={() => navigate(`/canvas/${file.id}`)}
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    borderColor: 'var(--accent-primary)'
                  }}
                >
                  打开
                </Button>
              ]}
            >
              <p>创建时间：{file.createTime?.toDate?.().toLocaleString?.() || '—'}</p>
              <p>修改时间：{file.lastEditTime?.toDate?.().toLocaleString?.() || '—'}</p>
              <p>协作者：{(file.collaborators || []).map(c => collaboratorNames[c.userId] || c.userId).join(', ') || '无'}</p>
            </Card>
          </Col>
        ))}
      </Row>

      {sortedManuscripts.length === 0 && (
        <p style={{ color: '#999', textAlign: 'center' }}>暂无我的手稿</p>
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

      {/* 创建文件弹窗 */}
      <Modal
        title="命名"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          setNewFileName('');
        }}
        onOk={handleCreateFile}
        okText="确认"
        cancelText="取消"
        okButtonProps={{
          style: {
            backgroundColor: 'var(--accent-primary)',
            borderColor: 'var(--accent-primary)'
          }
        }}
      >
        <Input
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          placeholder="输入文件名"
          style={{
            fontFamily: 'var(--font-family-base)'
          }}
        />
      </Modal>

      {/* 分享弹窗 */}
      <Modal
        title="分享文档"
        open={isShareModalVisible}
        onCancel={() => setIsShareModalVisible(false)}
        footer={null}
        width={400}
      >
        <Form
          form={shareForm}
          layout="vertical"
          initialValues={{ permission: 'read', password: '' }}
        >
          <Form.Item
            name="permission"
            label="访问权限"
            rules={[{ required: true, message: '请选择访问权限' }]}
          >
            <Select>
              <Select.Option value="read">互联网获得链接的人 可阅读</Select.Option>
              <Select.Option value="edit">互联网获得链接的人 可编辑</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="password"
            label="设置密码"
          >
            <Input placeholder="默认无密码" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<LinkOutlined />}
              onClick={() => {
                const permission = shareForm.getFieldValue('permission');
                const password = shareForm.getFieldValue('password') || '';
                handleCopyLink(selectedFile.id, permission, password);
              }}
              style={{ width: '100%' }}
            >
              复制链接
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};