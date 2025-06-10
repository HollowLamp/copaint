import React, { useEffect, useState } from 'react';
import { Typography, Form, Input, Button, Space, App } from 'antd';
import { useAuthUser } from '../../hooks/useAuthUser';
import { getUserInfo, logout } from '../../services/userService';
import { updatePassword } from 'firebase/auth';
import { auth } from '../../services/firebase'; // 你的 Firebase 实例

export const Component = () => {
  const { user: authUser, loading } = useAuthUser();
  const [userInfo, setUserInfo] = useState(null);
  const { message } = App.useApp();
  useEffect(() => {
    if (authUser && authUser.uid) {
      getUserInfo(authUser.uid)
        .then((data) => setUserInfo(data))
        .catch(() => message.error('获取用户信息失败'));
    }
  }, [authUser]);

  const handlePasswordChange = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      message.error('未登录或会话已过期');
      return;
    }

    try {
      await updatePassword(currentUser, values.newPassword);
      message.success('密码修改成功'); // ✅ 成功弹窗提示
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        message.error('为了安全，请重新登录后再尝试修改密码');
      } else {
        message.error(error.message || '密码修改失败');
      }
      console.error('修改密码失败:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  if (loading) {
    return <Typography.Paragraph>正在加载...</Typography.Paragraph>;
  }

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={3}>账户设置</Typography.Title>

      {userInfo ? (
        <Typography.Paragraph>
          用户ID：<strong>{authUser?.uid}</strong><br />
          昵称：<strong>{userInfo.nickname}</strong><br />
          邮箱：<strong>{userInfo.email}</strong>
        </Typography.Paragraph>
      ) : (
        <Typography.Paragraph>未能获取用户信息</Typography.Paragraph>
      )}

      <Form layout="vertical" onFinish={handlePasswordChange} style={{ maxWidth: 400 }}>
        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[{ required: true, message: '请输入新密码' }]}
        >
          <Input.Password placeholder="输入新密码" />
        </Form.Item>

        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次密码输入不一致'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="再次输入新密码" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              修改密码
            </Button>
            <Button danger onClick={handleLogout}>
              退出登录
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};