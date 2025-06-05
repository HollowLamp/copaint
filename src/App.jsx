import { RouterProvider } from './router/RouterProvider';
import { ThemeProvider, useTheme } from './hooks/ThemeContext';
import { App as AntApp, ConfigProvider, theme } from 'antd';

const AntConfigProvider = ({ children }) => {
  const { theme: currentTheme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: 'var(--orange-500)',
          colorPrimaryHover: 'var(--orange-400)',
          colorPrimaryActive: 'var(--orange-600)',

          colorBgContainer: 'var(--bg-secondary)',
          colorBgElevated: 'var(--bg-primary)',
          colorBgSpotlight: 'var(--bg-secondary)',

          colorText: 'var(--text-primary)',
          colorTextSecondary: 'var(--text-secondary)',

          colorBorder: 'var(--border-color)',
          borderRadius: 4,

          fontFamily: `AlibabaPuHuiTi, SourceHanSansSC, -apple-system, BlinkMacSystemFont,
            'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif,
            'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'`,
          fontFamilyCode: `Poppins, source-code-pro, Menlo, Monaco, Consolas,
            'Courier New', monospace`,
          fontSize: 14,
        },
        components: {
          Typography: {
            fontFamilyHeading: `ZCOOLKuaiLe, AlibabaPuHuiTi, SourceHanSansSC,
              -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
          },
          Button: {
            fontFamily: `AlibabaPuHuiTi, SourceHanSansSC, -apple-system,
              BlinkMacSystemFont, 'Segoe UI', sans-serif`,
          },
          Input: {
            fontFamily: `AlibabaPuHuiTi, SourceHanSansSC, -apple-system,
              BlinkMacSystemFont, 'Segoe UI', sans-serif`,
          },
          Modal: {
            titleFontFamily: `ZCOOLKuaiLe, AlibabaPuHuiTi, SourceHanSansSC,
              -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
          },
        },
      }}
    >
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AntConfigProvider>
        <RouterProvider />
      </AntConfigProvider>
    </ThemeProvider>
  );
}

export default App;
