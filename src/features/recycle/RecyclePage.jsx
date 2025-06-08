
import React, { useEffect, useState } from 'react';
import { Card, Button, Radio, Row, Col, message, Space, App } from 'antd';
import { DeleteOutlined, RollbackOutlined } from '@ant-design/icons';
import { auth } from '../../services/firebase';
import * as fileService from '../../services/fileService';
import * as userService from '../../services/userService'; // 导入用户服务

const SORT_OPTIONS = [
  { label: '按删除时间', value: 'recycleTime' }, // 修改为实际字段名
  { label: '按文件名', value: 'fileName' } // 修改为实际字段名
];

export const Component = () => {
  const { message } = App.useApp();
  const [deletedFiles, setDeletedFiles] = useState([]);
  const [sortBy, setSortBy] = useState('recycleTime'); // 修改默认排序字段
  const [ascending, setAscending] = useState(false);
  const [ownerNicknames, setOwnerNicknames] = useState({});

  // 获取当前用户的回收文件
  useEffect(() => {
    const fetchRecycleFiles = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return message.error("请先登录");

        const files = await fileService.getMyFiles(uid, true);
        console.log("♻️ 回收文件：", files);
        
        // 获取所有不重复的ownerId
        const ownerIds = [...new Set(files.map(file => file.ownerId))];
        
        // 批量获取所有owner的昵称
        const nicknames = {};
        await Promise.all(
          ownerIds.map(async (ownerId) => {
            try {
              const nickname = await userService.getNicknameById(ownerId);
              nicknames[ownerId] = nickname;
            } catch (error) {
              console.error(`获取用户 ${ownerId} 昵称失败:`, error);
              nicknames[ownerId] = '未知';
            }
          })
        );
        
        setOwnerNicknames(nicknames);
        setDeletedFiles(files);
      } catch (err) {
        console.error(err);
        message.error("加载回收站失败");
      }
    };

    fetchRecycleFiles();
  }, []);
//改进后的排序逻辑
  const sortedFiles = [...deletedFiles].sort((a, b) => {
    // 处理时间类型的排序
    if (sortBy === 'recycleTime') {
      const timeA = a.recycleTime?.toDate?.()?.getTime?.() || 0;
      const timeB = b.recycleTime?.toDate?.()?.getTime?.() || 0;
      return ascending ? timeA - timeB : timeB - timeA;
    }
    
    // 处理文件名的排序 - 支持中文拼音
    if (sortBy === 'fileName') {
      const nameA = a.fileName?.toString() || '';
      const nameB = b.fileName?.toString() || '';
      return ascending 
        ? nameA.localeCompare(nameB, 'zh-CN', { sensitivity: 'accent' })
        : nameB.localeCompare(nameA, 'zh-CN', { sensitivity: 'accent' });
    }
    
    return 0;
  });

  // 恢复文件（保持不变）
  const handleRestore = async (fileId) => {
    try {
      await fileService.restoreFile(fileId);
      message.success("文件已恢复");
      setDeletedFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      console.error(err);
      message.error("恢复失败");
    }
  };

  // 永久删除（保持不变）
  const handleDelete = async (fileId) => {
    try {
      await fileService.deleteFile(fileId);
      message.success("文件已彻底删除");
      setDeletedFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      console.error(err);
      message.error("删除失败");
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>回收站</h2>

      {/* 排序控制区域 */}
      <Space style={{ marginBottom: 20 }}>
        <Radio.Group
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
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
      </Space>

      {/* 文件卡片列表 */}
      <Row gutter={[16, 16]}>
        {sortedFiles.map(file => (
          <Col key={file.id} span={6}>
            <Card
              title={file.fileName || '未命名文件'}
              actions={[
                <Button
                  type="link"
                  icon={<RollbackOutlined />}
                  onClick={() => handleRestore(file.id)}
                >
                  恢复
                </Button>,
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(file.id)}
                >
                  删除
                </Button>
              ]}
            >
              <p>文件ID：{file.id}</p>
              <p>删除时间：{file.recycleTime?.toDate?.().toLocaleString?.() || '未知'}</p>
              <p>创建者：{ownerNicknames[file.ownerId] || '未知'}</p>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 空状态提示 */}
      {deletedFiles.length === 0 && (
        <p style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
          暂无回收文件
        </p>
      )}
    </div>
  );
};
