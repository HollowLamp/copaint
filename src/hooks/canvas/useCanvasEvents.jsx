import { fabric } from 'fabric';
import { useEffect, useRef } from 'react';

export const useCanvasEvents = ({ save, canvas, setSelectedObjects, clearSelectionCallback }) => {
  const saveTimeoutRef = useRef(null);

  // 防抖保存函数，避免批量操作时重复保存
  const debouncedSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, 100); // 100ms防抖，比较短但能避免批量操作重复保存
  };

  useEffect(() => {
    if (canvas) {
      // 对 canvas 的对象增删改行为进行监听，使用防抖保存
      canvas.on('object:added', debouncedSave);
      canvas.on('object:removed', debouncedSave);
      canvas.on('object:modified', debouncedSave);

      // 当用户创建或更新选择区域时，更新选中对象
      canvas.on('selection:created', (e) => {
        setSelectedObjects(e.selected || []);
      });
      canvas.on('selection:updated', (e) => {
        setSelectedObjects(e.selected || []);
      });

      // 清空选中时，更新状态并调用外部清空回调
      canvas.on('selection:cleared', () => {
        setSelectedObjects([]);
        clearSelectionCallback?.();
      });
    }

    return () => {
      if (canvas) {
        canvas.off('object:added', debouncedSave);
        canvas.off('object:removed', debouncedSave);
        canvas.off('object:modified', debouncedSave);
        canvas.off('selection:created');
        canvas.off('selection:updated');
        canvas.off('selection:cleared');
      }

      // 清理定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [save, canvas, clearSelectionCallback, setSelectedObjects]);
};
