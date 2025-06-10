import { useEvent } from 'react-use';

export const useWindowEvents = () => {
  // 页面关闭前提示确认 - 已禁用
  // useEvent('beforeunload', (event) => {
  //   (event || window.event).returnValue = 'Are you sure you want to leave?';
  // });
};
