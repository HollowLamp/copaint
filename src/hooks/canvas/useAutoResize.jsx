import { fabric } from 'fabric';
import { useCallback, useEffect } from 'react';

export const useAutoResize = ({ canvas, container }) => {
  const autoZoom = useCallback(() => {
    if (!canvas || !container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;

    canvas.setWidth(width);
    canvas.setHeight(height);

    const center = canvas.getCenter();
    const zoomRatio = 0.85;

    const localWorkspace = canvas.getObjects().find((obj) => obj.name === 'clip');

    const scale = fabric.util.findScaleToFit(localWorkspace, {
      width,
      height,
    });

    const zoom = zoomRatio * scale;

    canvas.setViewportTransform(fabric.iMatrix.concat());
    canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom);

    if (!localWorkspace) return;

    const workspaceCenter = localWorkspace.getCenterPoint();
    const viewportTransform = canvas.viewportTransform;

    if (canvas.width === undefined || canvas.height === undefined || !viewportTransform) {
      return;
    }

    // 平移视图，使 workspace 保持居中
    viewportTransform[4] = canvas.width / 2 - workspaceCenter.x * viewportTransform[0];
    viewportTransform[5] = canvas.height / 2 - workspaceCenter.y * viewportTransform[3];

    canvas.setViewportTransform(viewportTransform);

    // 克隆 workspace 区域并作为 clipPath，用于裁剪显示区域
    localWorkspace.clone((cloned) => {
      canvas.clipPath = cloned;
      canvas.requestRenderAll();
    });
  }, [canvas, container]);

  useEffect(() => {
    let resizeObserver = null;

    if (canvas && container) {
      resizeObserver = new ResizeObserver(() => {
        autoZoom();
      });

      resizeObserver.observe(container);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [canvas, container, autoZoom]);

  return { autoZoom };
};
