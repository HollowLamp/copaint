import React, { useEffect, useState } from 'react';
import { Button, Card, Dropdown, Menu, Input, Space, Radio, Row, Col, message, Modal, App } from 'antd';
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
  { label: '按创建时间排序', value: 'createTime' },
  { label: '按修改时间排序', value: 'lastEditTime' },
  { label: '按首字母排序', value: 'fileName' },
];

export const Component = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [sortBy, setSortBy] = useState('favoriteTime');
  const [ascending, setAscending] = useState(true);
  const [search, setSearch] = useState('');
  const [renamingFile, setRenamingFile] = useState(null);
  const [newName, setNewName] = useState('');
  const [collaboratorNames, setCollaboratorNames] = useState({});
  const [isNamesLoaded, setIsNamesLoaded] = useState(false);
  const [ownerNicknames, setOwnerNicknames] = useState({});

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        message.error("用户未登录");
        return;
      }
      const favs = await userService.getFavorites(uid);
      if (!Array.isArray(favs) || favs.length === 0) {
        setFavorites([]);
        return;
      }
      const files = await Promise.all(
        favs.map(async (fileId) => {
          const file = await fileService.getFileContent(fileId);
          return {
            ...file,
            id: fileId,
          };
        })
      );

      // 获取所有文件所有者的昵称
      const newNames = { ...collaboratorNames };
      const promises = files.map(async (file) => {
        if (!collaboratorNames[file.ownerId]) {
          try {
            const userDetails = await getUserDetails(file.ownerId);
            newNames[file.ownerId] = userDetails.nickname;
          } catch (error) {
            console.error('获取用户信息失败:', error);
            newNames[file.ownerId] = file.ownerId;
          }
        }
      });

      await Promise.all(promises);
      setCollaboratorNames(newNames);
           // 获取所有不重复的ownerId
           const ownerIds = [...new Set(files.map(file => file.ownerId))];
      
           // 批量获取所有owner的昵称
           const nicknames = {};
           await Promise.all(
             ownerIds.map(async (ownerId) => {
               const nickname = await userService.getNicknameById(ownerId);
               nicknames[ownerId] = nickname;
             })
           );
           setOwnerNicknames(nicknames);
      setFavorites(files);
    } catch (err) {
      console.error("❌ 加载收藏夹失败:", err);
      message.error("加载收藏夹失败");
    }
  };

  
  const SORT_FIELD_MAP = {
    favoriteTime: 'favoriteTime',
    createTime: 'createTime',
    lastEditTime: 'lastEditTime',  // 修改点
    fileName: 'fileName',            // 修改点
  };

  const sortedFavorites = [...favorites]
  .filter(file => file.fileName?.includes(search))
  .sort((a, b) => {
    const field = SORT_FIELD_MAP[sortBy];
    const valA = a[field];
    const valB = b[field];

    // 改进后的排序值获取逻辑
    const getSortableValue = (v) => {
      // 处理时间类型
      if (field.includes('Time') && v?.toDate) {
        return v.toDate().getTime();
      }
      // 处理文件名（支持中文）
      if (field === 'fileName') {
        return v?.toString() || '';
      }
      return v?.toString()?.toLowerCase() || '';
    };

    const aVal = getSortableValue(valA);
    const bVal = getSortableValue(valB);

    // 使用 localeCompare 进行字符串比较
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return ascending 
        ? aVal.localeCompare(bVal, 'zh-Hans-CN') 
        : bVal.localeCompare(aVal, 'zh-Hans-CN');
    }

    // 数值比较
    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });


  const handleUnfavorite = async (fileId) => {
    try {
      const uid = auth.currentUser?.uid;
      await userService.removeFavorite(uid, fileId);
      message.success("已取消收藏");  
      fetchFavorites();
    } catch (err) {
      console.error(err);
      message.error("操作失败");
    }
  };
  const handleRecycle = async (fileId) => {
    try {
      const uid = auth.currentUser?.uid;
      await fileService.recycleFile(fileId); // 确保此 fileId 正确
      await userService.removeFavorite(uid, fileId);
      message.success("已放入回收站");
      fetchFavorites(); // 确保这个函数能更新当前状态
    } catch (err) {
      message.error(err.message || "操作失败"); 
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      await fileService.renameFile(renamingFile.id, newName.trim());
      message.success("重命名成功");
      setRenamingFile(null);
      setNewName('');
      fetchFavorites();
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
      fetchFavorites();
    } catch (err) {
      console.error(err);
      message.error("创建副本失败");
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
      <Menu.Item danger icon={<DeleteOutlined />} onClick={() => handleRecycle(file.id)}>
        删除
      </Menu.Item>
    </Menu>
  );

  return (
    <div style={{ padding: '20px' }}>
      <h2>收藏夹</h2>
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
        {sortedFavorites.map((file) => (
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
                <Button size="small" danger onClick={() => handleUnfavorite(file.id)}>已收藏</Button>,
                <Button
                  size="small"
                  type="primary"
                  onClick={() => navigate(`/canvas/${file.id}`)}
                >
                  打开
                </Button>
              ]}
            >
              <p>创建时间：{file.createTime?.toDate?.().toLocaleString?.() || '—'}</p>
              <p>修改时间：{file.lastEditTime?.toDate?.().toLocaleString?.() || '—'}</p>
              <p>文件归属：{ownerNicknames[file.ownerId] || '未知'}</p>
            </Card>
          </Col>
        ))}
      </Row>

      {sortedFavorites.length === 0 && (
        <p style={{ color: '#999', textAlign: 'center' }}>暂无收藏内容</p>
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
    </div>
  );
};
