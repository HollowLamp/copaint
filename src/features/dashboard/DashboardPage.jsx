import { useTheme } from '../../hooks/ThemeContext';
import { useNavigate } from 'react-router';
import { Button } from '../../components/button/Button';
import styles from './DashboardPage.module.css';

export const Component = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div>
      <h1>Dashboard Page</h1>
      <div className={styles.buttonGroup}>
        <Button onClick={toggleTheme} className={styles.themeButton}>
          Current Theme: {theme === 'light' ? '🌞' : '🌙'}
        </Button>

        <Button onClick={() => navigate('/login')}>Go to Login</Button>
        <Button onClick={() => navigate('/canvas/1')}>Go to Canvas</Button>
      </div>
    </div>
  );
};
