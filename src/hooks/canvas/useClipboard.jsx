import { fabric } from 'fabric';
import { useCallback, useRef } from 'react';

export const useClipboard = ({ canvas }) => {
  const clipboard = useRef(null);

  // 复制选中的对象
  const copy = useCallback(() => {
    canvas?.getActiveObject()?.clone((cloned) => {
      clipboard.current = cloned;
    });
  }, [canvas]);

  // 粘贴复制的对象，并进行偏移
  const paste = useCallback(() => {
    if (!clipboard.current) return;

    clipboard.current.clone((clonedObj) => {
      canvas?.discardActiveObject();

      clonedObj.set({
        left: clonedObj.left + 10,
        top: clonedObj.top + 10,
        evented: true,
      });

      if (clonedObj.type === 'activeSelection') {
        clonedObj.canvas = canvas;
        clonedObj.forEachObject((obj) => {
          canvas?.add(obj);
        });
        clonedObj.setCoords();
      } else {
        canvas?.add(clonedObj);
      }

      clipboard.current.top += 10;
      clipboard.current.left += 10;

      canvas?.setActiveObject(clonedObj);
      canvas?.requestRenderAll();
    });
  }, [canvas]);

  return { copy, paste };
};
