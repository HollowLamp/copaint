import { useEffect, useState } from 'react';
import { Layout, Menu, Space, message } from 'antd';
import {
  BookOutlined,
  StarOutlined,
  DeleteOutlined,
  HistoryOutlined,
  UserOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../hooks/ThemeContext';
import { useNavigate, useLocation, Outlet } from 'react-router';
import styles from './DashboardPage.module.css';
import { Button } from '../../components/button/Button';
import { logout, getUserInfo } from '../../services/userService';
import { UserMenu } from '../../components/usermenu/UserMenu';
import { useAuthUser } from '../../hooks/useAuthUser';

const { Header, Sider, Content } = Layout;

export const Component = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, loading } = useAuthUser();
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    if (authUser?.uid) {
      getUserInfo(authUser.uid)
        .then((info) => setNickname(info.nickname ))
        .catch(() => message.error('无法获取用户昵称'));
    }
  }, [authUser]);

  const menuItems = [
    {
      key: '/manuscripts',
      icon: <BookOutlined />,
      label: '绘画手稿',
    },
    {
      key: '/backup',
      icon: <HistoryOutlined />,
      label: '最近打开',
    },
    {
      key: '/favorites',
      icon: <StarOutlined />,
      label: '收藏夹',
    },
    {
      key: '/recycle',
      icon: <DeleteOutlined />,
      label: '回收站',
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  return (
    <Layout className={styles.dashboard}>
      <Sider theme={theme} width={200}>
        <div className={styles.logo}>CoPaint</div>
        <Menu
          theme={theme}
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
        />
        <Button onClick={() => navigate('/canvas/1')}>Go to canvas</Button>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </Sider>

      <Layout>
        <Header className={styles.header}>
          <Space>
            <BulbOutlined onClick={toggleTheme} className={styles.icon} />
            <UserMenu
              onLogout={handleLogout}
              onNavigate={navigate}
              nickname={nickname}
            />
          </Space>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};