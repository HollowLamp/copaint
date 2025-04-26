import styles from './Button.module.css';

export const Button = ({ onClick, children, className, ...props }) => {
  return (
    <button className={`${styles.button} ${className || ''}`} onClick={onClick} {...props}>
      {children}
    </button>
  );
};
