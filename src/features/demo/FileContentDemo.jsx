import React, { useState } from "react";
import { getFileContent, saveFileContent } from "../../services/fileService";
import { Button } from '../../components/button/Button';

export const Component = () => {
  const [fileId, setFileId] = useState("");
  const [content, setContent] = useState("");

  async function handleLoad() {
    const c = await getFileContent(fileId);
    setContent(JSON.stringify(c));
  }
  async function handleSave() {
    await saveFileContent(fileId, JSON.parse(content));
    alert("已保存内容");
  }

  return (
    <div style={{ maxWidth: 500, margin: "40px auto" }}>
      <h3>文件内容 Demo</h3>
      <input value={fileId} onChange={e => setFileId(e.target.value)} placeholder="文件ID" />
      <Button onClick={handleLoad}>读取内容</Button>
      <textarea value={content} onChange={e => setContent(e.target.value)} style={{ width: "100%", height: 100 }} />
      <Button onClick={handleSave}>保存内容</Button>
    </div>
  );
};
