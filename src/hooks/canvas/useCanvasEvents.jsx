import { fabric } from 'fabric';
import { useEffect } from 'react';

export const useCanvasEvents = ({ save, canvas, setSelectedObjects, clearSelectionCallback }) => {
  useEffect(() => {
    if (canvas) {
      // 对 canvas 的对象增删改行为进行监听，触发保存
      canvas.on('object:added', () => save());
      canvas.on('object:removed', () => save());
      canvas.on('object:modified', () => save());

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
        canvas.off('object:added');
        canvas.off('object:removed');
        canvas.off('object:modified');
        canvas.off('selection:created');
        canvas.off('selection:updated');
        canvas.off('selection:cleared');
      }
    };
  }, [save, canvas, clearSelectionCallback, setSelectedObjects]);
};
