import React, { useState, useEffect } from 'react';
import { App, Spin, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import styles from './MaterialLibraryPanel.module.css';

export const MaterialLibraryPanel = ({
  onClose,
  editor,
  dragRef,
  onMouseDown
}) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [batchNumber, setBatchNumber] = useState(1);

  // 固定图片ID池，使用Picsum的固定ID确保图片一致性
  const imageIdPool = [
    1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22,
    23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58,
    59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76,
    77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94,
    95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 106, 107, 108, 109, 110, 111,
    112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127,
    128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143,
    144, 145, 146, 147, 148, 149, 150, 152, 153, 154, 155, 156, 157, 158, 159, 160,
    161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176,
    177, 178, 180, 181, 182, 183, 184, 188, 189, 190, 191, 193, 194, 195, 196, 197,
    198, 199, 200, 201, 202, 203, 204, 206, 208, 209, 210, 211, 212, 213, 214, 215
  ];

  // 生成图片批次
  const generateImageBatch = (batchNum) => {
    // 每批12张图片，使用不同的起始索引确保每批都不同
    const startIndex = (batchNum - 1) * 12;
    const batchIds = [];

    // 从ID池中选择12个不重复的ID
    for (let i = 0; i < 12; i++) {
      const idIndex = (startIndex + i) % imageIdPool.length;
      batchIds.push(imageIdPool[idIndex]);
    }

    return batchIds.map((imageId, index) => ({
      id: `image-batch-${batchNum}-${index}`,
      imageId: imageId, // 保存固定的图片ID
      url: `https://picsum.photos/id/${imageId}/300/200`,
      fullUrl: `https://picsum.photos/id/${imageId}/1200/800`,
      alt: `素材图片 ${startIndex + index + 1}`,
      author: 'Picsum Photos'
    }));
  };

  // 加载图片
  const loadImages = async (batchNum) => {
    setLoading(true);
    try {
      const newImages = generateImageBatch(batchNum);
      setImages(newImages);
    } catch (error) {
      console.error('加载图片失败:', error);
      message.error('加载图片失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 换一批图片
  const handleRefresh = () => {
    const nextBatch = batchNumber + 1;
    setBatchNumber(nextBatch);
    loadImages(nextBatch);
  };

  // 添加图片到画布
  const handleImageClick = async (image) => {
    if (!editor) {
      message.error('画布编辑器未就绪');
      return;
    }

    try {
      // 使用图片的固定ID确保获取同一张图片
      const imageUrl = `https://picsum.photos/id/${image.imageId}/1200/800`;
      await editor.addImage(imageUrl);
      message.success('图片已添加到画布！');
    } catch (error) {
      console.error('添加图片失败:', error);
      message.error('添加图片失败，请重试');
    }
  };

  // 初始加载
  useEffect(() => {
    loadImages(1);
  }, []);



  return (
    <div className={styles.materialPanel} onMouseDown={onMouseDown}>
      <div ref={dragRef} className={styles.header}>
        <h3>素材库</h3>
        <div className={styles.headerActions}>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            disabled={loading}
            className={styles.refreshButton}
          >
            换一批
          </Button>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.imageGrid}>
          {images.map((image, index) => (
            <div
              key={`${image.id}-${index}`}
              className={styles.imageCard}
              onClick={() => handleImageClick(image)}
            >
              <img
                src={image.url}
                alt={image.alt}
                className={styles.image}
                loading="lazy"
              />
              <div className={styles.imageOverlay}>
                <span className={styles.addIcon}>+</span>
              </div>
              <div className={styles.imageInfo}>
                <span className={styles.imageAuthor}>{image.author}</span>
              </div>
            </div>
          ))}
        </div>

        {loading && (
          <div className={styles.loadingOverlay}>
            <Spin size="large" />
            <p>正在加载图片...</p>
          </div>
        )}
      </div>
    </div>
  );
};