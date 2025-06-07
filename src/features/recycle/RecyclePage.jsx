import React, { useEffect, useState } from 'react';
import { Card, Button, Radio, Row, Col, message, Space,App } from 'antd';
import { DeleteOutlined, RollbackOutlined } from '@ant-design/icons';
import { auth } from '../../services/firebase';
import * as fileService from '../../services/fileService';

const SORT_OPTIONS = [
  { label: '按删除时间', value: 'deleteTime' },
  { label: '按文件名', value: 'name' }
];

export const Component = () => {
  const { message } = App.useApp();
  const [deletedFiles, setDeletedFiles] = useState([]);
  const [sortBy, setSortBy] = useState('deleteTime');
  const [ascending, setAscending] = useState(false); // 默认倒序（最近的在前）

  // 获取当前用户的回收文件
  useEffect(() => {
    const fetchRecycleFiles = async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return message.error("请先登录");

        const files = await fileService.getMyFiles(uid, true);
        console.log("♻️ 回收文件：", files);
        setDeletedFiles(files);
      } catch (err) {
        console.error(err);
        message.error("加载回收站失败");
      }
    };

    fetchRecycleFiles();
  }, []);

  // 排序逻辑
  const sortedFiles = [...deletedFiles].sort((a, b) => {
    const valA = a[sortBy];
    const valB = b[sortBy];
    if (!valA || !valB) return 0;

    if (valA < valB) return ascending ? -1 : 1;
    if (valA > valB) return ascending ? 1 : -1;
    return 0;
  });

  // 恢复文件
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

  // 永久删除
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
              title={file.name || '未命名文件'}
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
              <p>创建者：{file.ownerName || '我自己'}</p>
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
