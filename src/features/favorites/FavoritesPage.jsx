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


const SORT_OPTIONS = [
  { label: '按收藏时间排序', value: 'favoriteTime' },
  { label: '按创建时间排序', value: 'createTime' },
  { label: '按修改时间排序', value: 'updateTime' },
  { label: '按首字母排序', value: 'name' },
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
      setFavorites(files);
    } catch (err) {
      console.error("❌ 加载收藏夹失败:", err);
      message.error("加载收藏夹失败");
    }
  };

  const sortedFavorites = [...favorites]
    .filter(file => file.fileName.includes(search))
    .sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
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
      <Menu.Item icon={<SwapOutlined />}>转移所有权</Menu.Item>
      <Menu.Item danger icon={<DeleteOutlined />} onClick={() => handleUnfavorite(file.id)}>
        删除
      </Menu.Item>
    </Menu>
  );

  return (
    <div style={{ padding: '20px' }}>
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
              <p>收藏时间：{file.favoriteTime?.toDate?.().toLocaleString?.() || '—'}</p>
              <p>创建时间：{file.createTime?.toDate?.().toLocaleString?.() || '—'}</p>
              <p>修改时间：{file.updateTime?.toDate?.().toLocaleString?.() || '—'}</p>
              <p>文件归属：{file.ownerName || '未知'}</p>
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
