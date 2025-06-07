import { fabric } from 'fabric';
import { useEffect, useRef } from 'react';
import { JSON_KEYS } from '../../utils/constants';

export const useLoadState = ({
  canvas,
  autoZoom,
  initialState,
  canvasHistory,
  setHistoryIndex,
}) => {
  const initialized = useRef(false);

  useEffect(() => {
    // 初始加载 canvas 状态，只执行一次
    if (!initialized.current && initialState?.current && canvas) {
      const data = JSON.parse(initialState.current);

      canvas.loadFromJSON(data, () => {
        const currentState = JSON.stringify(canvas.toJSON(JSON_KEYS));

        // 保存初始化历史状态
        canvasHistory.current = [currentState];
        setHistoryIndex(0);
        autoZoom(); // 加载完自动缩放居中
      });

      initialized.current = true;
    }
  }, [canvas, autoZoom, initialState, canvasHistory, setHistoryIndex]);
};
