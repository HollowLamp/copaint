import { Layout, Menu, Input, Space, Dropdown } from 'antd';
import {
  BookOutlined,
  StarOutlined,
  DeleteOutlined,
  HistoryOutlined,
  UserOutlined,
  BulbOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../hooks/ThemeContext';
import { useNavigate, useLocation, Outlet } from 'react-router';
import styles from './DashboardPage.module.css';
import { Button } from '../../components/button/Button';
import { logout } from '../../services/userService';

const { Header, Sider, Content } = Layout;
const { Search } = Input;

export const Component = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/manuscripts',
      icon: <BookOutlined />,
      label: '绘画手稿',
      children: [
        { key: '/manuscripts/forest', label: '森林物语' },
        { key: '/manuscripts/mountains', label: '山地公苑' },
      ],
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
    {
      key: '/backup',
      icon: <HistoryOutlined />,
      label: '本地历史备份',
    },
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: '个人中心',
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

  const dropdownItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

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
            <Search placeholder="搜索" allowClear style={{ width: 200 }} />
            <BulbOutlined onClick={toggleTheme} className={styles.icon} />
            <Dropdown menu={{ items: dropdownItems }} placement="bottomRight" arrow>
              <UserOutlined className={styles.icon} />
            </Dropdown>
          </Space>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
