import { Button as AntButton } from 'antd';
import styles from './Button.module.css';

export const Button = ({
  onClick,
  children,
  className,
  type = 'default',
  htmlType,
  loading,
  ...props
}) => {
  // 构建正确的 props
  const buttonProps = {
    ...props,
    className: `${styles.button} ${className || ''}`,
    onClick,
    type,
  };

  if (htmlType) buttonProps.htmlType = htmlType;
  if (loading !== undefined) buttonProps.loading = loading;

  return <AntButton {...buttonProps}>{children}</AntButton>;
};
