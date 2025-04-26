import { useTheme } from '../../hooks/ThemeContext';
import { useNavigate } from 'react-router';
import { Button } from '../../components/button/Button';
import styles from './DashboardPage.module.css';

export const Component = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div>
      <h1 style={{ fontFamily: 'Poppins' }}>Dashboard Page</h1>

      <div className={styles.buttonGroup}>
        <Button
          onClick={toggleTheme}
          style={{ fontFamily: 'AlibabaPuHuiTi' }}
          className={styles.themeButton}
        >
          当前主题: {theme === 'light' ? '🌞' : '🌙'}
        </Button>

        <Button onClick={() => navigate('/login')} style={{ fontFamily: 'SourceHanSansSC' }}>
          去登录页
        </Button>

        <Button onClick={() => navigate('/canvas/1')} style={{ fontFamily: 'ZCOOLKuaiLe' }}>
          去画板页
        </Button>
      </div>
    </div>
  );
};
