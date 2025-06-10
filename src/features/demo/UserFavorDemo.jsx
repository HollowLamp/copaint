import React, { useState } from "react";
import { getFavorites, addFavorite, removeFavorite } from "../../services/userService";
import { Button } from '../../components/button/Button';

export const Component = () => {
  const [uid, setUid] = useState("");        // 用户ID
  const [fileId, setFileId] = useState("");  // 文件ID
  const [favorites, setFavorites] = useState([]);

  // 获取收藏夹列表
  async function handleLoadFavorites() {
    try {
      const favs = await getFavorites(uid);
      setFavorites(favs);
    } catch (e) {
      alert("获取失败: " + e.message);
    }
  }

  // 添加收藏
  async function handleAddFavorite() {
    try {
      await addFavorite(uid, fileId);
      alert("已添加收藏");
      handleLoadFavorites();
    } catch (e) {
      alert("添加失败: " + e.message);
    }
  }

  // 移除收藏
  async function handleRemoveFavorite() {
    try {
      await removeFavorite(uid, fileId);
      alert("已取消收藏");
      handleLoadFavorites();
    } catch (e) {
      alert("移除失败: " + e.message);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <h3>收藏夹功能测试</h3>

      <input value={uid} onChange={e => setUid(e.target.value)} placeholder="用户ID" style={{ width: "100%", marginBottom: 10 }} />
      <input value={fileId} onChange={e => setFileId(e.target.value)} placeholder="文件ID" style={{ width: "100%", marginBottom: 10 }} />

      <Button onClick={handleLoadFavorites}>获取收藏夹</Button>
      <Button onClick={handleAddFavorite}>添加收藏</Button>
      <Button onClick={handleRemoveFavorite}>取消收藏</Button>

      <div style={{ marginTop: 20 }}>
        <strong>当前收藏列表：</strong>
        <ul>
          {favorites.map((fid, idx) => (
            <li key={idx}>{fid}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
