import React, { useState, useEffect } from 'react';
import { Form, Input, Modal, Divider, App } from 'antd';
import { UserOutlined, LockOutlined, GithubOutlined, GoogleOutlined } from '@ant-design/icons';
import { Button } from '../../components/button/Button';
import { useNavigate, Navigate, useLocation } from 'react-router';
import { useAuthUser } from '../../hooks/useAuthUser';
import styles from './LoginPage.module.css';
import {
  login,
  loginWithGithub,
  loginWithGoogle,
  register,
  resetPassword,
} from '../../services/userService';

export const Component = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuthUser(); // 解构 loading
  const [form] = Form.useForm();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerForm] = Form.useForm();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetForm] = Form.useForm();
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // 动画状态
  const [animationStarted, setAnimationStarted] = useState(false);

  // 启动动画
  useEffect(() => {
    if (!loading && !user) {
      // 在动画期间隐藏body滚动条
      document.body.style.overflow = 'hidden';

      // 页面加载完成后启动动画
      const timer = setTimeout(() => {
        setAnimationStarted(true);
        // 动画完成后恢复滚动条
        setTimeout(() => {
          document.body.style.overflow = '';
        }, 1500); // 等待所有动画完成
      }, 100);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    }
  }, [loading, user]);

  // 等待加载完成
  if (loading) {
    return null;
  }

  // 加载完成后再判断重定向
  if (user) {
    const from = location.state?.from || '/';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (values) => {
    try {
      setLoginLoading(true);
      await login(values.username, values.password);
      message.success('登录成功');
      navigate('/');
    } catch (error) {
      message.error('登录失败：' + error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (values) => {
    try {
      setRegisterLoading(true);
      await register(values.email, values.password, values.nickname);
      message.success('注册成功');
      setRegisterOpen(false);
      form.setFieldsValue({ username: values.email, password: values.password });
    } catch (error) {
      message.error('注册失败：' + error.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleGithub = async () => {
    try {
      setGithubLoading(true);
      await loginWithGithub();
      message.success('登录成功');
      navigate('/');
    } catch (error) {
      message.error('GitHub 登录失败：' + error.message);
    } finally {
      setGithubLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);
      await loginWithGoogle();
      message.success('登录成功');
      navigate('/');
    } catch (error) {
      message.error('Google 登录失败：' + error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleReset = async (values) => {
    try {
      setResetLoading(true);
      await resetPassword(values.email);
      message.success('重置密码邮件已发送，请查收');
      setResetOpen(false);
    } catch (error) {
      message.error(error.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className={`${styles.container} ${animationStarted ? styles.containerAnimated : ''}`}>
      <div className={`${styles.leftSection} ${animationStarted ? styles.leftSectionAnimated : ''}`}>
        <div className={`${styles.logoWrapper} ${animationStarted ? styles.logoWrapperAnimated : ''}`}>
          <img
            src="/login_logo.png"
            alt="CoPaint"
            className={`${styles.logo} ${animationStarted ? styles.logoAnimated : ''}`}
          />
          <h1 className={`${styles.brandName} ${animationStarted ? styles.brandNameAnimated : ''}`}>
            CoPaint
          </h1>
          <p className={`${styles.slogan} ${animationStarted ? styles.sloganAnimated : ''}`}>
            简单有趣的协作绘画工具
          </p>
        </div>
      </div>

      <div className={`${styles.rightSection} ${animationStarted ? styles.rightSectionAnimated : ''}`}>
        <div className={`${styles.formWrapper} ${animationStarted ? styles.formWrapperAnimated : ''}`}>
          <h1 className={`${styles.title} ${animationStarted ? styles.titleAnimated : ''}`}>
            欢迎回来
          </h1>
          <p className={`${styles.subtitle} ${animationStarted ? styles.subtitleAnimated : ''}`}>
            登录您的账户
          </p>

          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            autoComplete="off"
            layout="vertical"
            className={`${styles.form} ${animationStarted ? styles.formAnimated : ''}`}
          >
            <Form.Item name="username" rules={[{ required: true, message: '请输入邮箱' }]}>
              <Input prefix={<UserOutlined />} placeholder="邮箱" size="large" />
            </Form.Item>

            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
            </Form.Item>

            <Form.Item className={styles.remember}>
              <a className={styles.forgotPassword} onClick={() => setResetOpen(true)}>
                忘记密码？
              </a>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className={styles.submitButton}
                loading={loginLoading}
              >
                登录
              </Button>
            </Form.Item>

            <Divider>其他登录方式</Divider>

            <div className={styles.socialLogin}>
              <Button
                icon={<GithubOutlined />}
                onClick={handleGithub}
                loading={githubLoading}
                className={styles.socialButton}
              >
                GitHub 登录
              </Button>
              <Button
                icon={<GoogleOutlined />}
                onClick={handleGoogle}
                loading={googleLoading}
                className={styles.socialButton}
              >
                Google 登录
              </Button>
            </div>

            <div className={styles.footer}>
              <span>还没有账号？</span>
              <a onClick={() => setRegisterOpen(true)}>立即注册</a>
            </div>
          </Form>

          <Modal
            title="注册账号"
            open={registerOpen}
            onCancel={() => setRegisterOpen(false)}
            footer={null}
          >
            <Form form={registerForm} name="register" onFinish={handleRegister} layout="vertical">
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input placeholder="邮箱" />
              </Form.Item>
              <Form.Item name="nickname" rules={[{ required: true, message: '请输入昵称' }]}>
                <Input placeholder="昵称" />
              </Form.Item>
              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6位' },
                ]}
              >
                <Input.Password placeholder="密码" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={registerLoading}>
                  注册
                </Button>
              </Form.Item>
            </Form>
          </Modal>

          <Modal
            title="找回密码"
            open={resetOpen}
            onCancel={() => setResetOpen(false)}
            footer={null}
            maskClosable={false}
          >
            <Form form={resetForm} name="reset" onFinish={handleReset} layout="vertical">
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input prefix={<UserOutlined />} placeholder="请输入注册时的邮箱" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={resetLoading}>
                  发送重置邮件
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </div>
    </div>
  );
};
