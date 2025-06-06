import React, { useEffect, useState } from 'react';
import { Button, Card, Dropdown, Menu, Input, Space, Radio, Row, Col, message } from 'antd';
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

// 🔄 收藏夹排序方式
const SORT_OPTIONS = [
  { label: '按收藏时间排序', value: 'favoriteTime' },
  { label: '按创建时间排序', value: 'createTime' },
  { label: '按修改时间排序', value: 'updateTime' },
  { label: '按首字母排序', value: 'name' },
];

export const Component = () => {
  const [favorites, setFavorites] = useState([]); // 收藏的文件详情
  const [sortBy, setSortBy] = useState('favoriteTime'); // 当前排序方式
  const [ascending, setAscending] = useState(true); // 正序 or 倒序
  const [search, setSearch] = useState(''); // 搜索关键词

  // ✅ 组件加载时，从后端拉取收藏的文件列表
  useEffect(() => {
    fetchFavorites();
  }, []);

  // 🚀 获取当前用户收藏的文件列表并取出详情
  const fetchFavorites = async () => {
    try {
      const uid = auth.currentUser?.uid;
  
      if (!uid) {
        message.error("用户未登录");
        return;
      }
     
      console.log("当前用户 uid:", uid);
      // 1. 获取收藏的文件ID数组
      const favs = await userService.getFavorites(uid);
      console.log("✅ 收藏的文件ID:", favs); // 应该是 ['xxx', 'yyy']
  
      if (!Array.isArray(favs) || favs.length === 0) {
        setFavorites([]); // 没有收藏内容
        return;
      }
  
      // 2. 获取每个文件的详情
      const files = await Promise.all(
        favs.map(async (fileId) => {
          const file = await fileService.getFileById(fileId);
          return {
            ...file,
            id: fileId,              // 保留 fileId 用于删除等操作
          };
        })
      );
  
      console.log("✅ 收藏的文件详情:", files);
      setFavorites(files); // 存入状态
    } catch (err) {
      console.error("❌ 加载收藏夹失败:", err);
      message.error("加载收藏夹失败");
    }
  };
  

  // 🧠 处理排序
  const sortedFavorites = [...favorites]
    .filter(file => file.name.includes(search)) // 🔍 搜索过滤
    .sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    });

  // ❌ 从收藏夹移除文件
  const handleUnfavorite = async (fileId) => {
    try {
      const uid = auth.currentUser?.uid;
      await userService.removeFavorite(uid, fileId);
      message.success("已取消收藏");
      fetchFavorites(); // 刷新列表
    } catch (err) {
      console.error(err);
      message.error("操作失败");
    }
  };

  // 📋 卡片右上角更多操作菜单
  const renderMenu = (file) => (
    <Menu>
      <Menu.Item icon={<ShareAltOutlined />}>分享</Menu.Item>
      <Menu.Item icon={<LinkOutlined />}>复制链接</Menu.Item>
      <Menu.Item icon={<CopyOutlined />}>创建副本</Menu.Item>
      <Menu.Item icon={<SwapOutlined />}>转移所有权</Menu.Item>
      <Menu.Item danger icon={<DeleteOutlined />} onClick={() => handleUnfavorite(file.id)}>
        删除
      </Menu.Item>
    </Menu>
  );

  return (
    <div style={{ padding: '20px' }}>
      {/* 顶部操作区 */}
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

      {/* 文件卡片列表 */}
      <Row gutter={[16, 16]}>
        {sortedFavorites.map((file) => (
          <Col key={file.id} span={6}>
            <Card
              title={
                <span>
                  {file.name || '未命名'}
                  <EditOutlined style={{ marginLeft: 8 }} />
                </span>
              }
              extra={<Dropdown overlay={renderMenu(file)}><MoreOutlined /></Dropdown>}
              actions={[
                <Button size="small" danger onClick={() => handleUnfavorite(file.id)}>已收藏</Button>,
                <Button size="small" type="primary">打开</Button>
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

    </div>
  );
};
