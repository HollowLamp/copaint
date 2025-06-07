// src/components/UserMenu/UserMenu.jsx
import React from 'react';
import {
  UserOutlined,
  SettingOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';

export const UserMenu = ({ onLogout, onNavigate, nickname }) => {
    const items = [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: nickname ,
        //onClick: () => onNavigate('/profile'),
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: '设置',
        onClick: () => onNavigate('/settings'),
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: onLogout,
      },
    ];
  
    return (
      <Dropdown
        menu={{ items }}
        placement="bottomRight"
        arrow
        trigger={['click']}
      >
        <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
          <UserOutlined style={{ fontSize: 18 }} />
        </span>
      </Dropdown>
    );
  };