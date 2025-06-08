import React, { useRef, useState, useEffect } from 'react';
import styles from './DraggablePanel.module.css';

export const DraggablePanel = ({ children, initialPosition = { x: 0, y: 0 }, className = '' }) => {
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 处理鼠标按下事件
  const handleMouseDown = (e) => {
    // 只有点击头部才能拖动
    if (!dragRef.current?.contains(e.target)) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });

    // 防止文本选择
    e.preventDefault();
  };

  // 处理鼠标移动事件
  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newPosition = {
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    };

    // 确保面板不会被拖出视窗边界
    const panel = panelRef.current;
    if (panel) {
      const rect = panel.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      newPosition.x = Math.max(0, Math.min(newPosition.x, maxX));
      newPosition.y = Math.max(0, Math.min(newPosition.y, maxY));
    }

    setPosition(newPosition);
  };

  // 处理鼠标松开事件
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 添加全局事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);

  // 克隆子组件并添加拖动头部的引用
  const clonedChildren = React.cloneElement(children, {
    dragRef,
    onMouseDown: handleMouseDown,
    className: `${children.props.className || ''} ${styles.draggableContent}`.trim()
  });

  return (
    <div
      ref={panelRef}
      className={`${styles.draggablePanel} ${className} ${isDragging ? styles.dragging : ''}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {clonedChildren}
    </div>
  );
};