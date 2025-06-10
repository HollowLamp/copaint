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
import { PermissionRequestManager } from '../../components/permissonRequest/PermissionRequestManager';
import { getFileOwnerPermissionRequests } from '../../services/collaborationService';

const { Header, Sider, Content } = Layout;

export const Component = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, loading } = useAuthUser();
  const [nickname, setNickname] = useState('');
  const [showRequestManager, setShowRequestManager] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    if (authUser?.uid) {
      getUserInfo(authUser.uid)
        .then((info) => setNickname(info.nickname))
        .catch(() => message.error('无法获取用户昵称'));

      // 获取待处理的权限申请数量
      getFileOwnerPermissionRequests(authUser.uid)
        .then((requests) => setPendingRequestsCount(requests.length))
        .catch(() => console.error('获取权限申请失败'));
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
            {/* 权限申请提醒 */}
            {pendingRequestsCount > 0 && (
              <div
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)'
                }}
                onClick={() => setShowRequestManager(true)}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                }}
              >
                <span style={{ fontSize: '14px' }}>🔔</span>
                <span>{pendingRequestsCount}</span>
                <span style={{ fontSize: '11px', opacity: 0.9 }}>待处理</span>
              </div>
            )}
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

      {/* 权限申请管理弹窗 */}
      {showRequestManager && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <PermissionRequestManager
            userId={authUser?.uid}
            onClose={() => {
              setShowRequestManager(false);
              // 重新获取待处理申请数量
              if (authUser?.uid) {
                getFileOwnerPermissionRequests(authUser.uid)
                  .then((requests) => setPendingRequestsCount(requests.length))
                  .catch(() => console.error('获取权限申请失败'));
              }
            }}
          />
        </div>
      )}
    </Layout>
  );
};